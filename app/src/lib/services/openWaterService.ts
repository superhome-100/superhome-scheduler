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

export type BuoyGroupWithNames = {
  id: number
  res_date: string
  time_period: string
  buoy_name: string
  boat: string | null
  member_uids: string[] | null
  member_names: (string | null)[] | null
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
  // Direct SQL: admin-only by RLS; caller must have privileges
  const { data, error } = await supabase
    .from("buoy")
    .select("buoy_name, max_depth")
    .order("max_depth", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Buoy[];
}

export async function getBuoyGroupsWithNames({ resDate, timePeriod }: { resDate: string; timePeriod: TimePeriod }): Promise<BuoyGroupWithNames[]> {
  // Step 1: fetch groups for the day/period
  const { data: groups, error: groupsErr } = await supabase
    .from("buoy_group")
    .select("id, res_date, time_period, buoy_name, boat")
    .eq("res_date", resDate)
    .eq("time_period", timePeriod)
    .order("buoy_name", { ascending: true });
  if (groupsErr) throw new Error(groupsErr.message);

  const groupList = (groups ?? []) as Array<{ id: number; res_date: string; time_period: string; buoy_name: string; boat: string | null }>;
  if (groupList.length === 0) return [];

  const groupIds = groupList.map((g) => g.id);

  // Step 2: fetch members for these groups from res_openwater (group_id foreign key)
  const { data: members, error: memErr } = await supabase
    .from("res_openwater")
    .select("group_id, uid")
    .in("group_id", groupIds);
  if (memErr) throw new Error(memErr.message);

  const memberList = (members ?? []) as Array<{ group_id: number | null; uid: string }>;
  const uids = Array.from(new Set(memberList.map((m) => m.uid)));

  // Step 3: fetch names from user_profiles with RLS allowing admin
  let namesByUid = new Map<string, string | null>();
  if (uids.length > 0) {
    const { data: names, error: namesErr } = await supabase
      .from("user_profiles")
      .select("uid, name")
      .in("uid", uids);
    if (namesErr) throw new Error(namesErr.message);
    const nameList = (names ?? []) as Array<{ uid: string; name: string | null }>;
    nameList.forEach((n) => namesByUid.set(n.uid, n.name));
  }

  // Step 4: combine groups and members
  const result = groupList.map((g) => {
    const memberUids = memberList.filter((m) => m.group_id === g.id).map((m) => m.uid);
    const memberNames = memberUids.map((uid) => namesByUid.get(uid) ?? null) as (string | null)[];
    return {
      id: g.id,
      res_date: g.res_date,
      time_period: g.time_period,
      buoy_name: g.buoy_name,
      boat: g.boat,
      member_uids: memberUids.length ? memberUids : null,
      member_names: memberNames.length ? memberNames : null,
    };
  });
  return result;
}

export async function getMyAssignmentsViaRpc(
  selectedDate: string
): Promise<Record<TimePeriod, MyAssignment | null>> {
  // Determine current user
  const { data: me } = await supabase.auth.getUser();
  const uid = me?.user?.id ?? null;
  if (!uid) return { AM: null, PM: null };

  async function fetchAssignment(timePeriod: TimePeriod): Promise<MyAssignment | null> {
    // Look up res_openwater for this user/date/period with a group_id, and embed the buoy_group
    const { data: ow } = await supabase
      .from("res_openwater")
      .select("group_id, res_date, time_period, buoy_group(buoy_name, boat)")
      .eq("uid", uid as string)
      .eq("time_period", timePeriod)
      .gte("res_date", selectedDate)
      .lt("res_date", new Date(new Date(selectedDate).getTime() + 24*60*60*1000).toISOString())
      .not("group_id", "is", null)
      .maybeSingle();

    if (!ow || !(ow as any).buoy_group) return null;
    const g = (ow as any).buoy_group as { buoy_name: string | null; boat: string | null };
    return { buoy_name: g?.buoy_name ?? null, boat: g?.boat ?? null };
  }

  const [am, pm] = await Promise.all([fetchAssignment("AM"), fetchAssignment("PM")]);
  return { AM: am, PM: pm };
}

export async function getMyAssignmentsDirect(
  selectedDate: string,
  userId: string
): Promise<Record<TimePeriod, MyAssignment | null>> {
  async function fetchAssignment(timePeriod: TimePeriod): Promise<MyAssignment | null> {
    // Use res_openwater to find group_id and embed buoy_group info
    const { data: ow } = await supabase
      .from("res_openwater")
      .select("group_id, res_date, time_period, buoy_group(buoy_name, boat)")
      .eq("uid", userId)
      .eq("time_period", timePeriod)
      .gte("res_date", selectedDate)
      .lt("res_date", new Date(new Date(selectedDate).getTime() + 24*60*60*1000).toISOString())
      .not("group_id", "is", null)
      .maybeSingle();

    if (!ow || !(ow as any).buoy_group) return null;
    const g = (ow as any).buoy_group as { buoy_name: string | null; boat: string | null };
    return { buoy_name: g?.buoy_name ?? null, boat: g?.boat ?? null };
  }

  const [am, pm] = await Promise.all([fetchAssignment("AM"), fetchAssignment("PM")]);
  return { AM: am, PM: pm };
}
