/**
 * WhatsApp Send Helper
 * Sends messages via Meta WhatsApp Cloud API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface SendMessageParams {
  phoneNumberId: string;
  accessToken: string;
  toNumber: string;
  text: string;
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(
  params: SendMessageParams
): Promise<SendMessageResult> {
  const { phoneNumberId, accessToken, toNumber, text } = params;

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send message',
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log outbound message to database
 */
export async function logOutboundMessage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  params: {
    userId: string;
    connectionId: string;
    toNumber: string;
    bodyText: string;
    relatedInboundId?: string;
    metaMessageId?: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    errorMessage?: string;
  }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    await supabase.from('whatsapp_outbound_messages').insert({
      user_id: params.userId,
      connection_id: params.connectionId,
      to_number: params.toNumber,
      body_text: params.bodyText,
      related_inbound_id: params.relatedInboundId,
      meta_message_id: params.metaMessageId,
      status: params.status,
      error_message: params.errorMessage,
    });
  } catch (error) {
    console.error('Failed to log outbound message:', error);
  }
}

/**
 * Send message and log it
 */
export async function sendAndLogMessage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  connection: {
    id: string;
    user_id: string;
    phone_number_id: string;
    access_token_encrypted: string;
  },
  toNumber: string,
  text: string,
  relatedInboundId?: string
): Promise<SendMessageResult> {
  const result = await sendWhatsAppMessage({
    phoneNumberId: connection.phone_number_id,
    accessToken: connection.access_token_encrypted,
    toNumber,
    text,
  });

  // Log the message
  await logOutboundMessage(supabaseUrl, supabaseServiceKey, {
    userId: connection.user_id,
    connectionId: connection.id,
    toNumber,
    bodyText: text,
    relatedInboundId,
    metaMessageId: result.messageId,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
  });

  return result;
}
