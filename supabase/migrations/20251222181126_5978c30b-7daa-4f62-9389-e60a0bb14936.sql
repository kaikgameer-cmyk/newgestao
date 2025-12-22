-- Add vehicle_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vehicle_type text DEFAULT 'fuel' CHECK (vehicle_type IN ('electric', 'fuel'));

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.vehicle_type IS 'Type of vehicle: electric or fuel. Determines which modules are visible to the user.';