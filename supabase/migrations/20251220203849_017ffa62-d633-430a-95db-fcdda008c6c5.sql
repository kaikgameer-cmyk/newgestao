-- Add columns to revenues table for trip count, km and hours per revenue entry
ALTER TABLE public.revenues 
ADD COLUMN IF NOT EXISTS trips_count integer NULL,
ADD COLUMN IF NOT EXISTS km_rodados integer NULL,
ADD COLUMN IF NOT EXISTS worked_minutes integer NULL;