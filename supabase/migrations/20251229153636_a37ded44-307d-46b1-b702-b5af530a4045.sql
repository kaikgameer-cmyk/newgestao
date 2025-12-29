-- 1) Add role column to profiles (if not exists)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- 2) support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NULL,
  status text NOT NULL DEFAULT 'open', -- open | pending | resolved | closed
  priority text NOT NULL DEFAULT 'normal', -- low | normal | high
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_by_role text NOT NULL DEFAULT 'user'
);

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_user_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON public.support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message_at
  ON public.support_tickets(last_message_at DESC);

-- 3) support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,
  message text NOT NULL,
  attachments jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_ticket_fk
  FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_sender_fk
  FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id_created_at
  ON public.support_messages(ticket_id, created_at);

-- 4) support_reads table para controle de não lidas
CREATE TABLE IF NOT EXISTS public.support_reads (
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);

ALTER TABLE public.support_reads
  ADD CONSTRAINT support_reads_ticket_fk
  FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

-- 5) Função e trigger para updated_at em support_tickets
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- 6) Função e trigger para last_message_at em support_tickets quando entra mensagem
CREATE OR REPLACE FUNCTION public.touch_support_ticket_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_messages_after_insert ON public.support_messages;
CREATE TRIGGER trg_support_messages_after_insert
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_support_ticket_last_message();

-- 7) Habilitar RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_reads ENABLE ROW LEVEL SECURITY;

-- 8) Políticas RLS para support_tickets
-- Limpar políticas antigas, se existirem
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can insert support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;

-- SELECT: usuário vê só os próprios tickets
CREATE POLICY "Users can view own support tickets"
ON public.support_tickets
FOR SELECT
USING (user_id = auth.uid());

-- SELECT: admin vê todos
CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- INSERT: usuário cria ticket apenas para ele mesmo
CREATE POLICY "Users can insert own support tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- INSERT: admin pode criar tickets para qualquer usuário (opcional)
CREATE POLICY "Admins can insert support tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- UPDATE: apenas admin pode atualizar (status, resolved_at, priority, etc.)
CREATE POLICY "Admins can update support tickets"
ON public.support_tickets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 9) Políticas RLS para support_messages
DROP POLICY IF EXISTS "Users can view own support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can insert support messages" ON public.support_messages;

-- SELECT: usuário vê mensagens apenas de tickets dele
CREATE POLICY "Users can view own support messages"
ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id
      AND t.user_id = auth.uid()
  )
);

-- SELECT: admin vê todas
CREATE POLICY "Admins can view all support messages"
ON public.support_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- INSERT: usuário só envia mensagem em ticket dele e aberto/pending
CREATE POLICY "Users can insert support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = 'user'
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND t.user_id = auth.uid()
      AND t.status IN ('open', 'pending')
  )
);

-- INSERT: admin insere em qualquer ticket que não esteja fechado
CREATE POLICY "Admins can insert support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND sender_id = auth.uid()
  AND sender_role = 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND t.status <> 'closed'
  )
);

-- 10) Políticas RLS para support_reads
DROP POLICY IF EXISTS "Users can manage own support reads" ON public.support_reads;

CREATE POLICY "Users can manage own support reads"
ON public.support_reads
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 11) Storage bucket para anexos de suporte
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage.objects para bucket support-attachments
-- Observação: vamos usar o padrão de path: support/{user_id}/{ticket_id}/{message_id}/{filename}
DROP POLICY IF EXISTS "Support attachments upload" ON storage.objects;
DROP POLICY IF EXISTS "Support attachments read" ON storage.objects;

CREATE POLICY "Support attachments upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (
    -- Dono do path (segmento 2 = user_id)
    auth.uid()::text = (storage.foldername(name))[2]
    OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Support attachments read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'support-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[2]
    OR has_role(auth.uid(), 'admin')
  )
);
