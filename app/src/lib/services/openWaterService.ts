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
}

export interface MoveReservationToBuoyPayload {
  reservation_id: number;
  buoy_id: string;
  res_date: string;
  time_period: TimePeriod;
}

export async function moveReservationToBuoy(
  payload: MoveReservationToBuoyPayload
): Promise<void> {
  const res = await callFunction<MoveReservationToBuoyPayload, { ok: boolean }>(
    "openwater-move-buoy",
    payload
  );

  if (res.error) {
    throw new Error(res.error);
  }
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

  console.log('[getBuoyGroupsWithNames] raw rows from RPC', rows);

  // Collect all unique member uids across groups
  const allUids = Array.from(
    new Set(
      rows.flatMap((r) => (Array.isArray(r.member_uids) ? r.member_uids : [])),
    ),
  );

  console.log('[getBuoyGroupsWithNames] all member UIDs', allUids);

  let nameMap = new Map<string, { name: string | null; nickname: string | null }>();
  if (allUids.length) {
    const { data: profiles, error: profilesErr } = await withAuthRetry<
      Array<{ uid: string; name: string | null; nickname: string | null }>
    >(async () =>
      await supabase
        .from('user_profiles')
        .select('uid, name, nickname')
        .in('uid', allUids),
    );

    if (!profilesErr && profiles) {
      console.log('[getBuoyGroupsWithNames] loaded profiles', profiles);
      profiles.forEach((p: any) => {
        nameMap.set(p.uid, {
          name: p.name ?? null,
          nickname: p.nickname ?? null,
        });
      });
      console.log('[getBuoyGroupsWithNames] nameMap keys', Array.from(nameMap.keys()));
    }
  }

  return rows.map((r) => {
    const member_uids = r.member_uids ?? null;
    let member_names: (string | null)[] | null = null;

    if (member_uids && member_uids.length) {
      member_names = member_uids.map((uid) => {
        const entry = nameMap.get(uid);
        if (!entry) return null;
        const display = entry.nickname || entry.name;
        return display && String(display).trim() !== '' ? display : null;
      });
      console.log('[getBuoyGroupsWithNames] group', r.id, 'member_uids', member_uids, 'member_names', member_names);
    }

    return {
      id: r.id,
      res_date: r.res_date,
      time_period: r.time_period,
      buoy_name: r.buoy_name,
      boat: r.boat,
      boat_count: r.boat_count ?? null,
      open_water_type: r.open_water_type ?? null,
      member_uids,
      member_names,
    } as BuoyGroupWithNames;
  });
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
    const { data: names, error: namesErr } = await withAuthRetry<
      Array<{ uid: string; name: string | null; nickname: string | null }>
    >(async () =>
      await supabase
        .from("user_profiles")
        .select("uid, name, nickname")
        .in("uid", uids)
    );
    if (namesErr) throw new Error(namesErr.message);
    (names ?? []).forEach((n: any) => {
      const display = (n.nickname ?? n.name) as string | null;
      nameMap.set(n.uid, display);
    });
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

// Helper to fetch buddy group member names for a given slot and current user
export async function getBuddyGroupMembersForSlot(
  resDate: string,
  timePeriod: TimePeriod,
  resType: 'open_water' | 'pool',
  currentUid: string,
): Promise<string[]> {
  const dateOnly = resDate.split('T')[0];

  const { data, error } = await supabase.rpc('get_buddy_group_with_members', {
    p_res_date: dateOnly,
    p_time_period: timePeriod,
    p_res_type: resType,
  });

  if (error) {
    console.error('Error loading buddy group members via RPC:', error.message);
    return [];
  }

  type RpcRow = {
    buddy_group_id: string;
    member_uid: string;
    member_status: string;
  };

  const rows = (data ?? []) as RpcRow[];
  if (!rows.length) return [];

  // Find the buddy_group that includes the current user
  const myRow = rows.find((r) => r.member_uid === currentUid);
  if (!myRow) return [];

  const groupId = myRow.buddy_group_id;
  const groupRows = rows.filter((r) => r.buddy_group_id === groupId);
  const memberUids = Array.from(new Set(groupRows.map((r) => r.member_uid)));

  if (!memberUids.length) return [];

  // Fetch names from user_profiles using withAuthRetry to respect RLS
  const { data: names, error: namesErr } = await withAuthRetry<
    Array<{ uid: string; name: string | null; nickname: string | null }>
  >(async () =>
    await supabase
      .from('user_profiles')
      .select('uid, name, nickname')
      .in('uid', memberUids),
  );

  if (namesErr) {
    console.error('Error loading buddy member names:', namesErr.message);
    return [];
  }

  const nameMap = new Map<string, { name: string | null; nickname: string | null }>();
  (names ?? []).forEach((n: any) =>
    nameMap.set(n.uid, { name: n.name ?? null, nickname: n.nickname ?? null }),
  );

  // Build a unique, ordered list of buddy UIDs excluding the current user
  const buddyUids = Array.from(
    new Set(
      groupRows
        .map((r) => r.member_uid)
        .filter((uid) => uid !== currentUid),
    ),
  );

  // Map to display names, preferring name then nickname
  const buddyNames = buddyUids
    .map((uid) => {
      const entry = nameMap.get(uid);
      if (!entry) return null;
      const display = entry.nickname || entry.name;
      return display && display.trim() !== '' ? display : null;
    })
    .filter((name): name is string => !!name);

  return buddyNames;
}

// Helper to fetch all buddy nicknames (or names) for a specific reservation_id
// Used by admin move-to-buoy dialog to display the full buddy group.
export async function getBuddyNicknamesForReservation(
  reservationId: number,
): Promise<string[]> {
  const res = await callFunction<{ reservation_id: number }, string[]>(
    'get-buddy-nicknames',
    { reservation_id: reservationId },
  );

  if (res.error) {
    console.error('[getBuddyNicknamesForReservation] error', res.error);
    return [];
  }

  if (!Array.isArray(res.data)) return [];
  return res.data.filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
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
