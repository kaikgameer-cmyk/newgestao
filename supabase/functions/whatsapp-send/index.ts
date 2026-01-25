/**
 * WhatsApp Send Edge Function
 * Internal utility for sending WhatsApp messages
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub as string;

    // Parse request body
    const { to_number, message } = await req.json();

    if (!to_number || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing to_number or message' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's connection
    const { data: connection, error: connError } = await supabase
      .from('whatsapp_connections')
      .select('id, user_id, phone_number_id, access_token_encrypted, whatsapp_enabled')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp não conectado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!connection.whatsapp_enabled) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp desabilitado para este usuário' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!connection.access_token_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Token de acesso não configurado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send message
    const result = await sendAndLogMessage(
      supabaseUrl,
      supabaseServiceKey,
      connection,
      to_number,
      message
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: result.messageId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Send error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
