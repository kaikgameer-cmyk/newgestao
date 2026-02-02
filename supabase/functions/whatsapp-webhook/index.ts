/**
 * WhatsApp Webhook Edge Function - SaaS Mode
 * 
 * Receives events from Meta WhatsApp Cloud API
 * Uses centralized bot credentials - users connect via pairing code
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseWhatsAppMessage, isConfirmation } from '../_shared/whatsappParser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Send WhatsApp message using centralized bot credentials
 */
async function sendBotMessage(
  phoneNumberId: string,
  accessToken: string,
  toNumber: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('WhatsApp API error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const botPhoneNumberId = Deno.env.get('WHATSAPP_BOT_PHONE_NUMBER_ID');
  const botAccessToken = Deno.env.get('WHATSAPP_BOT_ACCESS_TOKEN');
  
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

      // For SaaS mode, use a fixed verify token from env
      const expectedToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'newgestao_webhook_verify';
      
      if (token !== expectedToken) {
        console.log('Invalid verify token');
        return new Response('Invalid verify token', { status: 403 });
      }

      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    }

    // POST request: Incoming webhook events
    if (req.method === 'POST') {
      const payload = await req.json();
      console.log('Webhook event received, entry count:', payload.entry?.length ?? 0);

      // Check bot credentials
      if (!botPhoneNumberId || !botAccessToken) {
        console.error('Bot credentials not configured');
        return new Response(JSON.stringify({ status: 'ok', message: 'Bot not configured' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const message = value.messages[0];
      const fromNumber = message.from;
      const messageId = message.id;
      const bodyText = message.text?.body?.trim() || '';

      if (!fromNumber || !messageId) {
        console.error('Missing required message fields');
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // HANDLE CONNECT COMMAND (Pairing Flow)
      // ============================================
      if (bodyText.toUpperCase().startsWith('CONNECT ')) {
        const code = bodyText.substring(8).trim().toUpperCase();
        
        if (!code) {
          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
            '❌ Código inválido.\n\nEnvie: CONNECT <SEU_CÓDIGO>\n\nGere um novo código no app em Configurações → WhatsApp.');
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find valid pairing token
        const { data: token, error: tokenError } = await supabase
          .from('whatsapp_pairing_tokens')
          .select('id, user_id, expires_at')
          .eq('code', code)
          .is('used_at', null)
          .maybeSingle();

        if (tokenError || !token) {
          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
            '❌ Código não encontrado ou já utilizado.\n\nGere um novo código no app em Configurações → WhatsApp.');
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if expired
        if (new Date(token.expires_at) < new Date()) {
          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
            '⏰ Código expirado.\n\nGere um novo código no app em Configurações → WhatsApp.');
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if this phone is already connected to another user
        const { data: existingConnection } = await supabase
          .from('whatsapp_connections')
          .select('id, user_id')
          .eq('wa_phone', fromNumber)
          .eq('status', 'connected')
          .maybeSingle();

        if (existingConnection && existingConnection.user_id !== token.user_id) {
          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
            '⚠️ Este número já está conectado a outra conta.\n\nDesconecte primeiro no app ou use outro número.');
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Mark token as used
        await supabase
          .from('whatsapp_pairing_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', token.id);

        // Create or update connection
        const { error: connectionError } = await supabase
          .from('whatsapp_connections')
          .upsert({
            user_id: token.user_id,
            wa_phone: fromNumber,
            status: 'connected',
            whatsapp_enabled: true,
            connected_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (connectionError) {
          console.error('Failed to create connection:', connectionError);
          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
            '❌ Erro ao conectar. Tente novamente.');
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Send success message
        await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
          '✅ *WhatsApp conectado com sucesso!*\n\n' +
          'Agora você pode criar lançamentos por mensagem:\n\n' +
          '📥 *Receita:*\nreceita hoje uber 250 km 120 horas 8 corridas 12\n\n' +
          '📤 *Despesa:*\ndespesa ontem alimentacao 45.90\n\n' +
          '⛽ *Combustível:*\ncombustivel hoje gasolina 200 litros 40\n\n' +
          '⚡ *Elétrico:*\neletrico hoje 50 kwh 25\n\n' +
          'Após enviar, confirme com *SIM* ou cancele com *NÃO*.');

        console.log(`User ${token.user_id} connected phone ${fromNumber}`);
        return new Response(JSON.stringify({ status: 'ok', connected: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // FIND USER CONNECTION BY PHONE NUMBER
      // ============================================
      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('id, user_id, whatsapp_enabled, status')
        .eq('wa_phone', fromNumber)
        .eq('status', 'connected')
        .maybeSingle();

      if (!connection) {
        // User not connected, send help
        await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
          '👋 Olá! Este número não está conectado ao New Gestão.\n\n' +
          'Para usar o bot:\n' +
          '1. Acesse o app New Gestão\n' +
          '2. Vá em Configurações → WhatsApp\n' +
          '3. Clique em "Conectar"\n' +
          '4. Envie o código aqui\n\n' +
          '📱 https://newgestao.app');
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user has WhatsApp enabled
      if (!connection.whatsapp_enabled) {
        await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
          '⚠️ Seu bot está desativado.\n\nAtive em Configurações → WhatsApp no app.');
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update last_seen_at
      await supabase
        .from('whatsapp_connections')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', connection.id);

      // Check for duplicate message
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
          phone_number_id: botPhoneNumberId,
          from_number: fromNumber,
          message_id: messageId,
          message_type: message.type || 'text',
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

      // ============================================
      // HANDLE CONFIRMATION (SIM/NÃO)
      // ============================================
      const confirmation = isConfirmation(bodyText);
      
      // Check for pending draft
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

      // If there's a pending draft but response is not SIM/NÃO
      if (pendingDraft && confirmation === null) {
        await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
          '⚠️ Responda apenas *SIM* para confirmar ou *NÃO* para cancelar.');
        
        await supabase
          .from('whatsapp_inbound_messages')
          .update({ processed: true })
          .eq('id', inbound.id);
          
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (confirmation !== null) {
        if (!pendingDraft) {
          // Check for expired draft
          const { data: expiredDraft } = await supabase
            .from('whatsapp_drafts')
            .select('id')
            .eq('user_id', connection.user_id)
            .eq('from_number', fromNumber)
            .eq('status', 'awaiting_confirmation')
            .lte('expires_at', new Date().toISOString())
            .limit(1)
            .maybeSingle();

          const msg = expiredDraft
            ? '⏰ Lançamento expirado (30 minutos). Envie o comando novamente.'
            : '❌ Não há lançamento pendente.\n\nEnvie um novo comando para criar.';

          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber, msg);
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (confirmation === 'yes') {
          // Process and save
          const result = await processConfirmation(supabaseUrl, supabaseServiceKey, pendingDraft);
          
          if (result.success) {
            await supabase
              .from('whatsapp_drafts')
              .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
              .eq('id', pendingDraft.id);

            await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
              '✅ Lançamento salvo com sucesso!\n\nO registro já aparece em Lançamentos no app.');
          } else {
            await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
              `❌ Erro ao salvar: ${result.error}\n\nTente novamente.`);
          }
        } else {
          // Cancel
          await supabase
            .from('whatsapp_drafts')
            .update({ status: 'canceled' })
            .eq('id', pendingDraft.id);

          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
            '❌ Lançamento cancelado.\n\nSe quiser, envie um novo comando.');
        }

        await supabase
          .from('whatsapp_inbound_messages')
          .update({ processed: true })
          .eq('id', inbound.id);

        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // PARSE NEW COMMAND
      // ============================================
      const parsed = parseWhatsAppMessage(bodyText);

      if ('error' in parsed) {
        let response = parsed.message;
        if (parsed.examples?.length) {
          response += '\n\n' + parsed.examples.join('\n');
        }

        await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber, response);
      } else {
        // Create draft
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
          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber,
            '❌ Erro interno. Tente novamente.');
        } else {
          const confirmMessage = `${parsed.summary}\n\n✅ Confirma? Responda *SIM* ou *NÃO*.`;
          await sendBotMessage(botPhoneNumberId, botAccessToken, fromNumber, confirmMessage);
        }
      }

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

        const { data: existing } = await supabase
          .from('income_days')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) return { success: true };

        const date = payload.date || new Date().toISOString().split('T')[0];

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

        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) return { success: true };

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

        const { data: existing } = await supabase
          .from('fuel_logs')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) return { success: true };

        const date = payload.date || new Date().toISOString().split('T')[0];

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

        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) return { success: true };

        const date = payload.date || new Date().toISOString().split('T')[0];

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
