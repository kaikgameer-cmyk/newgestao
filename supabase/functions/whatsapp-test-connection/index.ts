/**
 * WhatsApp Test Connection Edge Function
 * Tests if the WhatsApp connection is working
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

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

    // Get user's connection
    const { data: connection, error: connError } = await supabase
      .from('whatsapp_connections')
      .select('id, phone_number_id, access_token_encrypted')
      .eq('user_id', userId)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conexão não encontrada' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!connection.access_token_encrypted || !connection.phone_number_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração incompleta' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test the connection by fetching phone number details
    const response = await fetch(
      `${WHATSAPP_API_URL}/${connection.phone_number_id}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token_encrypted}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Update connection status to error
      await supabase
        .from('whatsapp_connections')
        .update({
          status: 'error',
          last_error: data.error?.message || 'API test failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: data.error?.message || 'Falha na validação do token',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update connection status to connected and store phone number
    await supabase
      .from('whatsapp_connections')
      .update({
        status: 'connected',
        business_phone: data.display_phone_number || data.verified_name,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: data.display_phone_number,
        verified_name: data.verified_name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Test connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
