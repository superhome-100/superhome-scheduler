import { supabase } from "../utils/supabase";
import { callFunction } from "../utils/functions";

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
  const res = await callFunction<{ group_id: number; buoy_name: string }, { ok: boolean }>(
    "update-buoy-assignment",
    { group_id: groupId, buoy_name: buoyName }
  );
  if (res.error) throw new Error(res.error);
}

export async function updateBoatAssignment(
  groupId: number,
  boatName: string
): Promise<void> {
  const res = await callFunction<{ group_id: number; boat: string }, { ok: boolean }>(
    "update-boat-assignment",
    { group_id: groupId, boat: boatName }
  );
  if (res.error) throw new Error(res.error);
}

export async function loadAvailableBuoys(): Promise<Buoy[]> {
  const res = await callFunction<Record<string, never>, Buoy[]>(
    "load-available-buoys",
    {}
  );
  if (res.error) throw new Error(res.error);
  return (res.data ?? []) as Buoy[];
}

export async function getMyAssignmentsViaRpc(
  selectedDate: string
): Promise<Record<TimePeriod, MyAssignment | null>> {
  const [am, pm] = await Promise.all([
    callFunction<{ res_date: string; time_period: "AM" }, { buoy_name: string | null; boat: string | null }>(
      "get-my-buoy-assignment",
      { res_date: selectedDate, time_period: "AM" }
    ),
    callFunction<{ res_date: string; time_period: "PM" }, { buoy_name: string | null; boat: string | null }>(
      "get-my-buoy-assignment",
      { res_date: selectedDate, time_period: "PM" }
    )
  ]);

  if (am.error || pm.error) {
    throw new Error(am.error || pm.error || "Edge function error");
  }

  return {
    AM: am.data ? { buoy_name: am.data.buoy_name, boat: am.data.boat } : null,
    PM: pm.data ? { buoy_name: pm.data.buoy_name, boat: pm.data.boat } : null,
  };
}

export async function getMyAssignmentsDirect(
  selectedDate: string,
  userId: string
): Promise<Record<TimePeriod, MyAssignment | null>> {
  const [am, pm] = await Promise.all([
    callFunction<{ res_date: string; time_period: "AM"; uid: string }, { buoy_name: string | null; boat: string | null }>(
      "get-my-buoy-assignment",
      { res_date: selectedDate, time_period: "AM", uid: userId }
    ),
    callFunction<{ res_date: string; time_period: "PM"; uid: string }, { buoy_name: string | null; boat: string | null }>(
      "get-my-buoy-assignment",
      { res_date: selectedDate, time_period: "PM", uid: userId }
    )
  ]);

  if (am.error || pm.error) {
    throw new Error(am.error || pm.error || "Edge function error");
  }

  return {
    AM: am.data ? { buoy_name: am.data.buoy_name, boat: am.data.boat } : null,
    PM: pm.data ? { buoy_name: pm.data.buoy_name, boat: pm.data.boat } : null,
  };
}
