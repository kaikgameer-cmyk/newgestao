-- Add color column to platforms for UI coloring
ALTER TABLE public.platforms
ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#FFC700';