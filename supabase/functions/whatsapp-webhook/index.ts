/**
 * WhatsApp Webhook Edge Function
 * Receives events from Meta WhatsApp Cloud API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseWhatsAppMessage, isConfirmation } from '../_shared/whatsappParser.ts';
import { sendAndLogMessage } from '../_shared/whatsappSend.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);

    // GET request: Webhook verification (Meta challenge)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode !== 'subscribe' || !token || !challenge) {
        return new Response('Invalid verification request', { status: 400 });
      }

      // Find connection with matching verify_token
      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('id, user_id')
        .eq('verify_token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (!connection) {
        console.log('No pending connection found for verify_token');
        return new Response('Invalid verify token', { status: 403 });
      }

      // Update connection status to connected
      await supabase
        .from('whatsapp_connections')
        .update({ status: 'connected', updated_at: new Date().toISOString() })
        .eq('id', connection.id);

      console.log(`Connection ${connection.id} verified successfully`);
      return new Response(challenge, { status: 200 });
    }

    // POST request: Incoming webhook events
    if (req.method === 'POST') {
      const payload = await req.json();
      // Only log minimal info - never log full payload with sensitive data
      console.log('Webhook event received, entry count:', payload.entry?.length ?? 0);

      // Check if WhatsApp feature is enabled globally
      const { data: globalEnabled } = await supabase.rpc('is_whatsapp_enabled');
      if (!globalEnabled) {
        console.log('WhatsApp feature disabled globally');
        return new Response(JSON.stringify({ status: 'ok', message: 'Feature disabled' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process messages
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.length) {
        // Status update or other event, not a message
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const message = value.messages[0];
      const phoneNumberId = value.metadata?.phone_number_id;
      const fromNumber = message.from;
      const messageId = message.id;
      const messageType = message.type;
      const bodyText = message.text?.body || '';

      if (!phoneNumberId || !fromNumber || !messageId) {
        console.error('Missing required message fields');
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find connection for this phone_number_id
      const { data: connectionData } = await supabase.rpc(
        'get_whatsapp_connection_by_phone',
        { p_phone_number_id: phoneNumberId }
      );

      const connection = connectionData?.[0];
      if (!connection) {
        console.log(`No connected account for phone_number_id: ${phoneNumberId}`);
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user has WhatsApp enabled
      if (!connection.whatsapp_enabled) {
        console.log(`User ${connection.user_id} has WhatsApp disabled`);
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for duplicate message (deduplication)
      const { data: existingMessage } = await supabase
        .from('whatsapp_inbound_messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle();

      if (existingMessage) {
        console.log(`Duplicate message ${messageId}, skipping`);
        return new Response(JSON.stringify({ status: 'ok', duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save inbound message
      const { data: inbound, error: inboundError } = await supabase
        .from('whatsapp_inbound_messages')
        .insert({
          user_id: connection.user_id,
          connection_id: connection.id,
          phone_number_id: phoneNumberId,
          from_number: fromNumber,
          message_id: messageId,
          message_type: messageType,
          body_text: bodyText,
          raw_payload: value,
        })
        .select('id')
        .single();

      if (inboundError) {
        console.error('Failed to save inbound message:', inboundError);
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get full connection for sending replies
      const { data: fullConnection } = await supabase
        .from('whatsapp_connections')
        .select('id, user_id, phone_number_id, access_token_encrypted')
        .eq('id', connection.id)
        .single();

      if (!fullConnection?.access_token_encrypted) {
        console.error('Connection missing access token');
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if this is a confirmation response (strict SIM/NÃO only)
      const confirmation = isConfirmation(bodyText);
      
      // Check if there's a pending draft to handle invalid responses
      const { data: pendingDraftForCheck } = await supabase
        .from('whatsapp_drafts')
        .select('id')
        .eq('user_id', connection.user_id)
        .eq('from_number', fromNumber)
        .eq('status', 'awaiting_confirmation')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      // If there's a pending draft but response is not SIM/NÃO, ask explicitly
      if (pendingDraftForCheck && confirmation === null) {
        await sendAndLogMessage(
          supabaseUrl,
          supabaseServiceKey,
          fullConnection,
          fromNumber,
          '⚠️ Responda apenas *SIM* para confirmar ou *NÃO* para cancelar.',
          inbound.id
        );
        
        await supabase
          .from('whatsapp_inbound_messages')
          .update({ processed: true })
          .eq('id', inbound.id);
          
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (confirmation) {
        // Find pending draft for this user/number
        const { data: pendingDraft } = await supabase
          .from('whatsapp_drafts')
          .select('*')
          .eq('user_id', connection.user_id)
          .eq('from_number', fromNumber)
          .eq('status', 'awaiting_confirmation')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!pendingDraft) {
          // Check if there's an expired draft
          const { data: expiredDraft } = await supabase
            .from('whatsapp_drafts')
            .select('id')
            .eq('user_id', connection.user_id)
            .eq('from_number', fromNumber)
            .eq('status', 'awaiting_confirmation')
            .lte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const message = expiredDraft
            ? '⏰ Lançamento expirado (30 minutos). Envie o comando novamente para criar um novo.'
            : '❌ Não há nenhum lançamento pendente para confirmar.\n\nEnvie um novo comando para criar um lançamento.';

          await sendAndLogMessage(
            supabaseUrl,
            supabaseServiceKey,
            fullConnection,
            fromNumber,
            message,
            inbound.id
          );
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (confirmation === 'yes') {
          // Process the draft and create actual transaction
          const result = await processConfirmation(supabaseUrl, supabaseServiceKey, pendingDraft);
          
          if (result.success) {
            await supabase
              .from('whatsapp_drafts')
              .update({
                status: 'confirmed',
                confirmed_at: new Date().toISOString(),
              })
              .eq('id', pendingDraft.id);

            await sendAndLogMessage(
              supabaseUrl,
              supabaseServiceKey,
              fullConnection,
              fromNumber,
              '✅ Lançamento salvo com sucesso!\n\nO registro já aparece em Lançamentos no app.',
              inbound.id
            );
          } else {
            await sendAndLogMessage(
              supabaseUrl,
              supabaseServiceKey,
              fullConnection,
              fromNumber,
              `❌ Erro ao salvar: ${result.error}\n\nTente novamente.`,
              inbound.id
            );
          }
        } else {
          // Cancel the draft
          await supabase
            .from('whatsapp_drafts')
            .update({ status: 'canceled' })
            .eq('id', pendingDraft.id);

          await sendAndLogMessage(
            supabaseUrl,
            supabaseServiceKey,
            fullConnection,
            fromNumber,
            '❌ Lançamento cancelado.\n\nSe quiser, envie um novo comando.',
            inbound.id
          );
        }

        // Mark message as processed
        await supabase
          .from('whatsapp_inbound_messages')
          .update({ processed: true })
          .eq('id', inbound.id);

        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse the message as a command
      const parsed = parseWhatsAppMessage(bodyText);

      if ('error' in parsed) {
        // Parsing failed, send help message
        let response = parsed.message;
        if (parsed.examples?.length) {
          response += '\n\n' + parsed.examples.join('\n');
        }

        await sendAndLogMessage(
          supabaseUrl,
          supabaseServiceKey,
          fullConnection,
          fromNumber,
          response,
          inbound.id
        );
      } else {
        // Create draft and ask for confirmation
        const { error: draftError } = await supabase
          .from('whatsapp_drafts')
          .insert({
            user_id: connection.user_id,
            inbound_message_id: inbound.id,
            from_number: fromNumber,
            message_id: messageId,
            draft_type: parsed.type,
            draft_payload: { ...parsed.payload, date: parsed.date },
            status: 'awaiting_confirmation',
          });

        if (draftError) {
          console.error('Failed to create draft:', draftError);
          await sendAndLogMessage(
            supabaseUrl,
            supabaseServiceKey,
            fullConnection,
            fromNumber,
            '❌ Erro interno. Tente novamente.',
            inbound.id
          );
        } else {
          const confirmMessage = `${parsed.summary}\n\n✅ Confirma? Responda *SIM* para salvar ou *NÃO* para cancelar.`;
          await sendAndLogMessage(
            supabaseUrl,
            supabaseServiceKey,
            fullConnection,
            fromNumber,
            confirmMessage,
            inbound.id
          );
        }
      }

      // Mark message as processed
      await supabase
        .from('whatsapp_inbound_messages')
        .update({ processed: true })
        .eq('id', inbound.id);

      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to Meta to prevent retries
    return new Response(JSON.stringify({ status: 'error', message: 'Internal error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Process confirmed draft and create actual transaction
 */
async function processConfirmation(
  supabaseUrl: string,
  supabaseServiceKey: string,
  draft: { 
    id: string;
    user_id: string;
    message_id: string;
    draft_type: string;
    draft_payload: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { user_id, message_id, draft_type, draft_payload } = draft;
  const externalId = `whatsapp_${message_id}`;

  try {
    switch (draft_type) {
      case 'receita': {
        const payload = draft_payload as {
          platform: string;
          amount: number;
          km_rodados: number;
          hours_minutes: number;
          trips: number;
          date?: string;
        };

        // Check for duplicate
        const { data: existing } = await supabase
          .from('income_days')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) {
          return { success: true }; // Already exists, consider success
        }

        const date = payload.date || new Date().toISOString().split('T')[0];

        // Create income_day
        const { data: incomeDay, error: incomeError } = await supabase
          .from('income_days')
          .insert({
            user_id,
            date,
            km_rodados: payload.km_rodados,
            hours_minutes: payload.hours_minutes,
            trips: payload.trips,
            source: 'whatsapp',
            external_id: externalId,
          } as Record<string, unknown>)
          .select('id')
          .single();

        if (incomeError) throw incomeError;

        // Create income_day_item
        await supabase.from('income_day_items').insert({
          user_id,
          income_day_id: (incomeDay as { id: string }).id,
          platform: payload.platform,
          amount: payload.amount,
          trips: payload.trips,
        } as Record<string, unknown>);

        return { success: true };
      }

      case 'despesa': {
        const payload = draft_payload as {
          category: string;
          amount: number;
          date?: string;
        };

        // Check for duplicate
        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) {
          return { success: true };
        }

        const date = payload.date || new Date().toISOString().split('T')[0];

        await supabase.from('expenses').insert({
          user_id,
          date,
          category: payload.category,
          amount: payload.amount,
          source: 'whatsapp',
          external_id: externalId,
        } as Record<string, unknown>);

        return { success: true };
      }

      case 'combustivel': {
        const payload = draft_payload as {
          fuel_type: string;
          total_value: number;
          liters: number;
          odometer_km?: number;
          date?: string;
        };

        // Check for duplicate
        const { data: existing } = await supabase
          .from('fuel_logs')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) {
          return { success: true };
        }

        const date = payload.date || new Date().toISOString().split('T')[0];

        // Create fuel_log
        const { data: fuelLog, error: fuelError } = await supabase
          .from('fuel_logs')
          .insert({
            user_id,
            date,
            fuel_type: payload.fuel_type,
            total_value: payload.total_value,
            liters: payload.liters,
            odometer_km: payload.odometer_km,
            source: 'whatsapp',
            external_id: externalId,
          } as Record<string, unknown>)
          .select('id')
          .single();

        if (fuelError) throw fuelError;

        // Create expense for extrato
        await supabase.from('expenses').insert({
          user_id,
          date,
          category: 'combustivel',
          amount: payload.total_value,
          fuel_log_id: (fuelLog as { id: string }).id,
          source: 'whatsapp',
          external_id: externalId,
        } as Record<string, unknown>);

        return { success: true };
      }

      case 'eletrico': {
        const payload = draft_payload as {
          total_value: number;
          kwh: number;
          odometer_km?: number;
          date?: string;
        };

        // Check for duplicate expense
        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) {
          return { success: true };
        }

        const date = payload.date || new Date().toISOString().split('T')[0];

        // For electric, we create an expense with category 'eletrico'
        await supabase.from('expenses').insert({
          user_id,
          date,
          category: 'eletrico',
          amount: payload.total_value,
          notes: `${payload.kwh} kWh${payload.odometer_km ? ` - ${payload.odometer_km} km` : ''}`,
          source: 'whatsapp',
          external_id: externalId,
        } as Record<string, unknown>);

        return { success: true };
      }

      default:
        return { success: false, error: 'Tipo de lançamento desconhecido' };
    }
  } catch (error) {
    console.error('Error processing confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    };
  }
}
