import { supabase } from "../utils/supabase";

export type TimePeriod = "AM" | "PM";

export interface Buoy {
  buoy_name: string;
  max_depth: number | null;
}

export interface BuoyGroupMember {
  uid: string;
}

export interface BuoyGroup {
  id: number;
  res_date: string;
  time_period: TimePeriod;
  buoy_name: string | null;
  boat: string | null;
  res_openwater?: BuoyGroupMember[];
}

export interface MyAssignment {
  buoy_name: string | null;
  boat: string | null;
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch (_e) {
    return null;
  }
}

export async function updateBuoyAssignment(
  groupId: number,
  buoyName: string
): Promise<void> {
  const { error } = await supabase
    .from("buoy_group")
    .update({ buoy_name: buoyName })
    .eq("id", groupId);
  if (error) throw error;
}

export async function updateBoatAssignment(
  groupId: number,
  boatName: string
): Promise<void> {
  const { error } = await supabase
    .from("buoy_group")
    .update({ boat: boatName })
    .eq("id", groupId);
  if (error) throw error;
}

export async function loadAvailableBuoys(): Promise<Buoy[]> {
  const { data, error } = await supabase
    .from("buoy")
    .select("buoy_name, max_depth")
    .order("max_depth", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Buoy[];
}

export async function getMyAssignmentsViaRpc(
  selectedDate: string
): Promise<Record<TimePeriod, MyAssignment | null>> {
  const [am, pm] = await Promise.all([
    supabase.rpc("get_my_buoy_assignment", {
      p_res_date: selectedDate,
      p_time_period: "AM",
    }),
    supabase.rpc("get_my_buoy_assignment", {
      p_res_date: selectedDate,
      p_time_period: "PM",
    }),
  ]);

  if (am.error || pm.error) {
    throw am.error || pm.error;
  }

  return {
    AM:
      am.data && (am.data as any[])[0]
        ? {
            buoy_name: (am.data as any[])[0].buoy_name ?? null,
            boat: (am.data as any[])[0].boat ?? null,
          }
        : null,
    PM:
      pm.data && (pm.data as any[])[0]
        ? {
            buoy_name: (pm.data as any[])[0].buoy_name ?? null,
            boat: (pm.data as any[])[0].boat ?? null,
          }
        : null,
  };
}

export async function getMyAssignmentsDirect(
  selectedDate: string,
  userId: string
): Promise<Record<TimePeriod, MyAssignment | null>> {
  const { data, error } = await supabase
    .from("buoy_group")
    .select(
      `time_period, buoy_name, boat, res_openwater!inner(uid)`
    )
    .eq("res_date", selectedDate)
    .eq("res_openwater.uid", userId);

  if (error) throw error;

  const groups = (data ?? []) as Array<{
    time_period: TimePeriod;
    buoy_name: string | null;
    boat: string | null;
  }>;

  const am = groups.find((g) => g.time_period === "AM") || null;
  const pm = groups.find((g) => g.time_period === "PM") || null;

  return {
    AM: am ? { buoy_name: am.buoy_name, boat: am.boat } : null,
    PM: pm ? { buoy_name: pm.buoy_name, boat: pm.boat } : null,
  };
}


