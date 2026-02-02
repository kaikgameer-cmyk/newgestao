/**
 * Create WhatsApp Pairing Code Edge Function
 * Generates a unique code for users to connect their WhatsApp
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate a short, user-friendly pairing code
 * Format: XXX-XXXXXXXX (e.g., B44-0GIZM277)
 */
function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; // Removed I, O to avoid confusion
  const prefix = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const suffix = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${suffix}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const botPhone = Deno.env.get('WHATSAPP_BOT_PHONE');

  if (!botPhone) {
    console.error('WHATSAPP_BOT_PHONE not configured');
    return new Response(JSON.stringify({ error: 'WhatsApp bot not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.user.id;

    // Check if user already has a connected WhatsApp
    const { data: existingConnection } = await supabase
      .from('whatsapp_connections')
      .select('id, status, wa_phone')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .maybeSingle();

    if (existingConnection) {
      return new Response(JSON.stringify({ 
        error: 'Você já possui um WhatsApp conectado',
        connected_phone: existingConnection.wa_phone 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invalidate any existing pending tokens for this user
    await supabase
      .from('whatsapp_pairing_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('used_at', null);

    // Generate new code
    let code = generatePairingCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('whatsapp_pairing_tokens')
        .select('id')
        .eq('code', code)
        .is('used_at', null)
        .maybeSingle();

      if (!existing) break;
      
      code = generatePairingCode();
      attempts++;
    }

    // Set expiration to 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save token
    const { error: insertError } = await supabase
      .from('whatsapp_pairing_tokens')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to create pairing token:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create pairing code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate WhatsApp link
    const connectMessage = `CONNECT ${code}`;
    const waLink = `https://wa.me/${botPhone.replace(/\D/g, '')}?text=${encodeURIComponent(connectMessage)}`;

    return new Response(JSON.stringify({
      code,
      expires_at: expiresAt.toISOString(),
      wa_link: waLink,
      bot_phone: botPhone,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating pairing code:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
