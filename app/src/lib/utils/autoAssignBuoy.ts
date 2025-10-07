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

async function getBuoys(): Promise<BuoyRow[]> {
  const { data, error } = await supabase
    .from('buoy')
    .select('buoy_name, max_depth')
    .order('max_depth', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as BuoyRow[]
}

function pickBuoy(buoys: BuoyRow[], targetDepth: number): BuoyRow | null {
  for (const b of buoys) {
    if (b.max_depth >= targetDepth) return b
  }
  return buoys.length ? buoys[buoys.length - 1] : null
}

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
  // Preconditions: caller must be admin (RLS). We can optionally check is_admin() via RPC if exposed.
  const [reservations, buoys] = await Promise.all([getConfirmedOpenWater(resDate, timePeriod), getBuoys()])

  // Only consider rows that have depth
  const eligible = reservations.filter((r) => r.depth_m !== null)
  const groups = makeGroups(eligible)

  const createdGroupIds: number[] = []
  const skipped: { reason: string; uids: string[] }[] = []

  for (const group of groups) {
    if (group.length === 0) continue
    const uids = group.map((g) => g.uid)
    const maxDepth = Math.max(...group.map((g) => g.depth_m ?? 0))

    const buoy = pickBuoy(buoys, maxDepth)
    if (!buoy) {
      skipped.push({ reason: 'no_buoy_available', uids })
      continue
    }

    try {
      const id = await insertBuoyGroup({
        resDate,
        timePeriod,
        buoyName: buoy.buoy_name,
        diverIds: uids
      })
      createdGroupIds.push(id)
    } catch (e: any) {
      skipped.push({ reason: e.message ?? 'insert_failed', uids })
    }
  }

  return { createdGroupIds, skipped }
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
  // Call Edge Function: get-buoy-groups-with-names
  const res = await callFunction<{ res_date: string; time_period: string }, BuoyGroupWithNames[]>(
    'get-buoy-groups-with-names',
    { res_date: resDate, time_period: timePeriod }
  )
  if (res.error) throw new Error(res.error)
  return (res.data ?? []) as BuoyGroupWithNames[]
}

