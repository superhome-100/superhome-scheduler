# Migration from buoy_group_members to res_openwater.group_id

## Overview

This migration eliminates the `buoy_group_members` table and uses the `group_id` field in `res_openwater` instead. This simplifies the schema by having a direct relationship between reservations and buoy groups.

## Changes Made

### 1. Database Schema Changes

#### Added:
- `group_id` field in `res_openwater` table
- Foreign key relationship to `buoy_group.id`
- Index for better query performance
- New trigger to enforce max 3 members per group

#### Removed:
- `buoy_group_members` table
- Related triggers and functions
- RLS policies on `buoy_group_members`

### 2. Function Updates

#### `get_my_buoy_assignment`
**Before:**
```sql
select g.buoy_name, g.boat
from public.buoy_group g
join public.buoy_group_members m on m.group_id = g.id
where g.res_date = p_res_date
  and g.time_period = p_time_period
  and m.uid = auth.uid()
```

**After:**
```sql
select g.buoy_name, g.boat
from public.buoy_group g
join public.res_openwater r on r.group_id = g.id
where g.res_date = p_res_date
  and g.time_period = p_time_period
  and r.uid = auth.uid()
```

#### `get_buoy_groups_with_names`
**Before:**
```sql
from public.buoy_group g
left join public.buoy_group_members m on m.group_id = g.id
left join public.user_profiles up on up.uid = m.uid
```

**After:**
```sql
from public.buoy_group g
left join public.res_openwater r on r.group_id = g.id
left join public.user_profiles up on up.uid = r.uid
```

### 3. Application Code Updates

#### SingleDayView.svelte
**Before:**
```typescript
const { data: buoyGroups, error } = await supabase
  .from('buoy_group')
  .select(`
    time_period,
    buoy_name,
    boat,
    buoy_group_members!inner(uid)
  `)
  .eq('res_date', selectedDate)
  .eq('buoy_group_members.uid', currentUserUid);
```

**After:**
```typescript
const { data: buoyGroups, error } = await supabase
  .from('buoy_group')
  .select(`
    time_period,
    buoy_name,
    boat,
    res_openwater!inner(uid)
  `)
  .eq('res_date', selectedDate)
  .eq('res_openwater.uid', currentUserUid);
```

### 4. New Functions Added

#### `get_group_members(p_group_id integer)`
Returns all members of a specific group using `res_openwater.group_id`.

#### `check_group_capacity(p_group_id integer)`
Checks how many members are in a group using `res_openwater.group_id`.

### 5. Updated Auto-Assign Logic

The `auto_assign_buoy` function now works directly with `res_openwater.group_id`:
- Creates new groups when needed
- Assigns reservations to existing groups with space
- Enforces max 3 members per group via trigger
- Updates `res_openwater.group_id` directly

## Benefits

1. **Simplified Schema**: Eliminates the need for a separate membership table
2. **Better Performance**: Direct relationship reduces JOIN complexity
3. **Data Integrity**: Foreign key constraints ensure consistency
4. **Easier Queries**: Direct access to group information from reservations
5. **Maintainability**: Fewer tables to manage and maintain

## Migration Steps

1. **Apply the migrations in order:**
   ```bash
   cd supabase
   npx supabase db reset
   ```

2. **Regenerate TypeScript types:**
   ```bash
   npx supabase gen types typescript --local > app/types/supabase.ts
   ```

3. **Update application code** (already done in this migration)

4. **Test the functionality:**
   - User assignments should work correctly
   - Admin group management should work
   - Auto-assign should work with new structure

## Data Migration

The migration automatically:
- Links existing reservations to their groups
- Preserves all existing group assignments
- Maintains data integrity throughout the process

## Rollback Plan

If needed, you can rollback by:
1. Restoring the `buoy_group_members` table
2. Reverting the function changes
3. Rebuilding the membership relationships

However, the new structure is more efficient and recommended for long-term use.
