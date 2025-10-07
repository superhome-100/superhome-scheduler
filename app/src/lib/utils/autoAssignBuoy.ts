import { supabase } from './supabase'
import { callFunction } from './functions'
import type { Database, Tables } from '../database.types'

// Auto-assign buoy groups for a specific date (YYYY-MM-DD) and time period (e.g., 'AM'|'PM')
// Notes:
// - Requires admin privileges due to RLS on buoy/buoy_group.
// - Groups 2-3 divers by closest depths (<=15m difference within a group).
// - Selects buoy whose max_depth >= max depth in group, minimizing unused capacity.
// - Inserts buoy_group rows with diver_ids (UUID[]). Boat assignment remains manual.

export type AutoAssignParams = {
  resDate: string // 'YYYY-MM-DD'
  timePeriod: string // matches res_openwater.time_period
}

export type AutoAssignResult = {
  createdGroupIds: number[]
  skipped: { reason: string; uids: string[] }[]
}

type OpenWaterRow = Tables<'res_openwater'> & { user_name?: string | null }

type BuoyRow = {
  buoy_name: string
  max_depth: number
}

// Group divers by depth proximity. Greedy pass on sorted depths.
// Groups 2-3 divers based on closest depth meters (preferably ≤15m difference)
/**
 * @deprecated Client-side grouping is deprecated. Use server-side Edge Function via autoAssignBuoyServer.
 */
function makeGroups(rows: OpenWaterRow[]): OpenWaterRow[][] {
  const sorted = [...rows].sort((a, b) => (a.depth_m ?? 0) - (b.depth_m ?? 0))
  const groups: OpenWaterRow[][] = []

  let i = 0
  while (i < sorted.length) {
    const group: OpenWaterRow[] = [sorted[i]]
    let j = i + 1
    
    // Try to add up to 2 more divers (max 3 total) within 15m depth difference
    while (j < sorted.length && group.length < 3) {
      const currentDepth = group[0].depth_m ?? 0
      const candidateDepth = sorted[j].depth_m ?? 0
      const depthDifference = Math.abs(candidateDepth - currentDepth)
      
      // Only add if within 15m difference
      if (depthDifference <= 15) {
        group.push(sorted[j])
        j++
      } else {
        break
      }
    }
    
    // If we have only 1 diver and there are more divers available,
    // try to find the closest diver even if >15m to avoid orphan
    if (group.length === 1 && j < sorted.length) {
      const next = sorted[j]
      if (next) {
        group.push(next)
        j++
      }
    }
    
    groups.push(group)
    i = j
  }
  return groups
}

/**
 * @deprecated Client-side fetch + grouping path is deprecated. Use autoAssignBuoyServer to run entirely on Edge Function.
 */
async function getConfirmedOpenWater(resDate: string, timePeriod: string): Promise<OpenWaterRow[]> {
  // Filter confirmed open_water for the day & time period
  const { data, error } = await supabase
    .from('res_openwater')
    .select(
      [
        'uid',
        'res_date',
        'res_status',
        'time_period',
        'depth_m',
        'note',
        'buoy',
        'pulley',
        'bottom_plate',
        'large_buoy'
      ].join(', ')
    )
    .eq('res_status', 'confirmed')
    .eq('time_period', timePeriod)

  if (error) throw error

  const rows = (data ?? []) as unknown as any[]
  const filtered = rows.filter(
    (r) =>
      r && typeof r === 'object' && 'res_date' in r &&
      typeof (r as any).res_date === 'string' &&
      ((r as any).res_date as string).slice(0, 10) === resDate
  )
  return filtered as OpenWaterRow[]
}

/**
 * @deprecated Client-side buoy selection is deprecated. Server computes assignment.
 */
async function getBuoys(): Promise<BuoyRow[]> {
  const { data, error } = await supabase
    .from('buoy')
    .select('buoy_name, max_depth')
    .order('max_depth', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as BuoyRow[]
}

/**
 * @deprecated Client-side buoy picking is deprecated. Server computes assignment.
 */
function pickBuoy(buoys: BuoyRow[], targetDepth: number): BuoyRow | null {
  for (const b of buoys) {
    if (b.max_depth >= targetDepth) return b
  }
  return buoys.length ? buoys[buoys.length - 1] : null
}

/**
 * @deprecated Direct client-side inserts to buoy_group are deprecated. Use autoAssignBuoyServer (Edge Function).
 */
async function insertBuoyGroup(params: {
  resDate: string
  timePeriod: string
  buoyName: string
  diverIds: string[]
  note?: string | null
}): Promise<number> {
  const payload: Database['public']['Tables']['buoy_group']['Insert'] = {
    res_date: params.resDate,
    time_period: params.timePeriod,
    buoy_name: params.buoyName,
    diver_ids: params.diverIds as unknown as string[],
    note: params.note ?? null
  } as any

  const { data, error } = await supabase.from('buoy_group').insert(payload).select('id').single()
  if (error) throw error
  return data!.id as number
}

export async function autoAssignBuoy({ resDate, timePeriod }: AutoAssignParams): Promise<AutoAssignResult> {
  // Deprecated: client-side grouping is disabled. Use server-side Edge Function for atomic operations.
  // Redirect to server implementation to enforce fully server-side grouping and insertion.
  return await autoAssignBuoyServer({ resDate, timePeriod })
}

// Server-side transactional auto-assign using RPC and normalized members table.
// Preferred method: avoids client-side race conditions and respects RLS.
export async function autoAssignBuoyServer({ resDate, timePeriod }: AutoAssignParams): Promise<AutoAssignResult> {
  // Call Edge Function: auto-assign-buoy
  const res = await callFunction<{ res_date: string; time_period: string }, { createdGroupIds?: number[]; skipped?: { reason: string; uids: string[] }[] }>(
    'auto-assign-buoy',
    { res_date: resDate, time_period: timePeriod }
  )

  if (res.error) throw new Error(res.error)
  return {
    createdGroupIds: Array.isArray(res.data?.createdGroupIds) ? res.data!.createdGroupIds! : [],
    skipped: Array.isArray(res.data?.skipped) ? res.data!.skipped! : []
  }
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

// Fetch groups with member names for display in Admin Single Day view
export async function getBuoyGroupsWithNames({ resDate, timePeriod }: AutoAssignParams): Promise<BuoyGroupWithNames[]> {
  // Step 1: fetch groups for the day/period (RLS expects admin)
  const { data: groups, error: groupsErr } = await supabase
    .from('buoy_group')
    .select('id, res_date, time_period, buoy_name, boat')
    .eq('res_date', resDate)
    .eq('time_period', timePeriod)
    .order('buoy_name', { ascending: true })
  if (groupsErr) throw new Error(groupsErr.message)

  const groupList = (groups ?? []) as Array<{ id: number; res_date: string; time_period: string; buoy_name: string; boat: string | null }>
  if (groupList.length === 0) return []

  const groupIds = groupList.map((g) => g.id)

  // Step 2: fetch members for these groups from res_openwater (group_id FK)
  const { data: members, error: memErr } = await supabase
    .from('res_openwater')
    .select('group_id, uid')
    .in('group_id', groupIds)
  if (memErr) throw new Error(memErr.message)

  const memberList = (members ?? []) as Array<{ group_id: number | null; uid: string }>
  const uids = Array.from(new Set(memberList.map((m) => m.uid)))

  // Step 3: fetch names from user_profiles
  const namesByUid = new Map<string, string | null>()
  if (uids.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from('user_profiles')
      .select('uid, name')
      .in('uid', uids)
    if (profErr) throw new Error(profErr.message)
    for (const p of (profiles ?? []) as Array<{ uid: string; name: string | null }>) {
      namesByUid.set(p.uid, p.name ?? null)
    }
  }

  // Step 4: combine
  const membersByGroup = new Map<number, string[]>()
  for (const m of memberList) {
    if (m.group_id == null) continue
    const arr = membersByGroup.get(m.group_id) ?? []
    arr.push(m.uid)
    membersByGroup.set(m.group_id, arr)
  }

  const result: BuoyGroupWithNames[] = groupList.map((g) => {
    const memberUids = membersByGroup.get(g.id) ?? []
    const memberNames = memberUids.map((u) => namesByUid.get(u) ?? null)
    return {
      id: g.id,
      res_date: g.res_date,
      time_period: g.time_period,
      buoy_name: g.buoy_name,
      boat: g.boat ?? null,
      member_uids: memberUids.length ? memberUids : null,
      member_names: memberNames.length ? memberNames : null
    }
  })

  return result
}

