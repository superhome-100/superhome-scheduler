import { supabase, withAuthRetry } from "../utils/supabase";
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
  boat_count?: number | null
  open_water_type?: string | null
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
  // Use RPC that returns groups with member names and open_water_type
  const { data, error } = await supabase.rpc('get_buoy_groups_with_names', {
    p_res_date: resDate,
    p_time_period: timePeriod,
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: number;
    res_date: string;
    time_period: string;
    buoy_name: string;
    boat: string | null;
    boat_count?: number | null;
    open_water_type?: string | null;
    member_uids?: string[] | null;
    member_names?: (string | null)[] | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    res_date: r.res_date,
    time_period: r.time_period,
    buoy_name: r.buoy_name,
    boat: r.boat,
    boat_count: r.boat_count ?? null,
    open_water_type: r.open_water_type ?? null,
    member_uids: r.member_uids ?? null,
    member_names: r.member_names ?? null,
  }));
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

// Types for group reservation details
export interface GroupReservationMember {
  uid: string;
  name: string | null;
  depth_m: number | null;
  student_count: number | null;
  bottom_plate: boolean;
  pulley: boolean;
  large_buoy: boolean;
  activity_type: string | null;
  open_water_type: string | null;
}

export interface GroupReservationDetails {
  group_id: number;
  res_date: string;
  time_period: TimePeriod;
  boat: string | null;
  buoy_name: string | null;
  members: GroupReservationMember[];
}

// Read-only helper to fetch all info required by the Group Reservation Details modal
export async function getGroupReservationDetails(groupId: number): Promise<GroupReservationDetails | null> {
  // Fetch members attached to the group along with their user names and required fields
  const { data, error } = await supabase
    .from("res_openwater")
    .select(
      [
        "uid",
        "res_date",
        "time_period",
        "depth_m",
        "student_count",
        "bottom_plate",
        "pulley",
        "large_buoy",
        "activity_type",
        "open_water_type",
        "buoy_group:buoy_group(boat, buoy_name)"
      ].join(", ")
    )
    .eq("group_id", groupId);

  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown) as Array<
    {
      uid: string;
      res_date: string;
      time_period: string | null;
      depth_m: number | null;
      student_count: number | null;
      bottom_plate: boolean;
      pulley: boolean;
      large_buoy: boolean;
      activity_type: string | null;
      open_water_type: string | null;
      buoy_group?: { boat: string | null; buoy_name: string | null } | null;
    }
  >;

  if (!rows.length) return null;

  // Fetch user names separately due to lack of direct FK from res_openwater to user_profiles
  const uids = Array.from(new Set(rows.map((r) => r.uid)));
  let nameMap = new Map<string, string | null>();
  if (uids.length) {
    const { data: names, error: namesErr } = await withAuthRetry<Array<{ uid: string; name: string | null }>>(async () =>
      await supabase
        .from("user_profiles")
        .select("uid, name")
        .in("uid", uids)
    );
    if (namesErr) throw new Error(namesErr.message);
    (names ?? []).forEach((n: any) => nameMap.set(n.uid, n.name ?? null));
  }

  const first = rows[0]!;
  const details: GroupReservationDetails = {
    group_id: groupId,
    res_date: first.res_date,
    time_period: (first.time_period === "PM" ? "PM" : "AM"),
    boat: first.buoy_group?.boat ?? null,
    buoy_name: first.buoy_group?.buoy_name ?? null,
    members: rows.map((r) => ({
      uid: r.uid,
      name: nameMap.get(r.uid) ?? null,
      depth_m: r.depth_m ?? null,
      student_count: r.student_count ?? null,
      bottom_plate: !!r.bottom_plate,
      pulley: !!r.pulley,
      large_buoy: !!r.large_buoy,
      activity_type: r.activity_type,
      open_water_type: r.open_water_type,
    })),
  };

  return details;
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
