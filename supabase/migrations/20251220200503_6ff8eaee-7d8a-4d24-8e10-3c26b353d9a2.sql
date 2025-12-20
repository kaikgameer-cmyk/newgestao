-- Allow end_km to be nullable for saving start_km first
ALTER TABLE public.daily_km_logs ALTER COLUMN end_km DROP NOT NULL;

-- Create trigger to auto-calculate km_driven when end_km is set
CREATE OR REPLACE FUNCTION public.calculate_km_driven()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_km IS NOT NULL AND NEW.start_km IS NOT NULL THEN
    NEW.km_driven := NEW.end_km - NEW.start_km;
  ELSE
    NEW.km_driven := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_calculate_km_driven ON public.daily_km_logs;
CREATE TRIGGER trg_calculate_km_driven
  BEFORE INSERT OR UPDATE ON public.daily_km_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_km_driven();