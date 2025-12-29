import { z } from "zod";

export const ticketCreateSchema = z.object({
  subject: z.string().max(80).optional(),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres").max(3000),
  images: z
    .array(
      z.object({
        file: z.instanceof(File),
        preview: z.string(),
      })
    )
    .max(3, "Máximo de 3 imagens por ticket")
    .optional(),
});

export const messageSchema = z.object({
  message: z.string().min(1, "Mensagem não pode estar vazia").max(3000),
  attachments: z
    .array(
      z.object({
        file: z.instanceof(File),
        preview: z.string(),
      })
    )
    .max(3, "Máximo de 3 imagens por mensagem")
    .optional(),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
