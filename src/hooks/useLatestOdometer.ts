import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Electric charge types to identify electric logs
const ELECTRIC_CHARGE_TYPES = ['ac_lento', 'ac_semi', 'dc_rapido', 'residencial'];

export interface OdometerData {
  currentOdometerKm: number;
  source: "fuel" | "electric";
  date: string;
}

export function useLatestOdometer() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["latest_odometer_unified", user?.id],
    queryFn: async (): Promise<OdometerData | null> => {
      if (!user) return null;

      // Fetch latest fuel log with odometer (excluding electric types)
      const { data: fuelData, error: fuelError } = await supabase
        .from("fuel_logs")
        .select("odometer_km, date, fuel_type")
        .eq("user_id", user.id)
        .not("odometer_km", "is", null)
        .not("fuel_type", "in", `(${ELECTRIC_CHARGE_TYPES.join(",")})`)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (fuelError) {
        console.error("Error fetching fuel odometer:", fuelError);
      }

      // Fetch latest electric log with odometer
      const { data: electricData, error: electricError } = await supabase
        .from("fuel_logs")
        .select("odometer_km, date, fuel_type")
        .eq("user_id", user.id)
        .not("odometer_km", "is", null)
        .in("fuel_type", ELECTRIC_CHARGE_TYPES)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (electricError) {
        console.error("Error fetching electric odometer:", electricError);
      }

      const fuelLog = fuelData?.[0];
      const electricLog = electricData?.[0];

      // If neither has data, return null
      if (!fuelLog && !electricLog) return null;

      // If only one has data, return that one
      if (!fuelLog && electricLog) {
        return {
          currentOdometerKm: Number(electricLog.odometer_km),
          source: "electric",
          date: electricLog.date,
        };
      }
      if (fuelLog && !electricLog) {
        return {
          currentOdometerKm: Number(fuelLog.odometer_km),
          source: "fuel",
          date: fuelLog.date,
        };
      }

      // Both have data - compare by date, then by km value
      const fuelDate = new Date(fuelLog!.date);
      const electricDate = new Date(electricLog!.date);
      const fuelKm = Number(fuelLog!.odometer_km);
      const electricKm = Number(electricLog!.odometer_km);

      if (fuelDate > electricDate) {
        return {
          currentOdometerKm: fuelKm,
          source: "fuel",
          date: fuelLog!.date,
        };
      } else if (electricDate > fuelDate) {
        return {
          currentOdometerKm: electricKm,
          source: "electric",
          date: electricLog!.date,
        };
      } else {
        // Same date - use the higher km value
        if (fuelKm >= electricKm) {
          return {
            currentOdometerKm: fuelKm,
            source: "fuel",
            date: fuelLog!.date,
          };
        } else {
          return {
            currentOdometerKm: electricKm,
            source: "electric",
            date: electricLog!.date,
          };
        }
      }
    },
    enabled: !!user,
  });
}
