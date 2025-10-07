# Apply Group ID Migration

## Steps to apply the group_id field to res_openwater table:

### 1. Apply the migration
```bash
cd supabase
npx supabase db reset
```

### 2. Regenerate TypeScript types
```bash
npx supabase gen types typescript --local > app/types/supabase.ts
```

### 3. Verify the changes
The migration will:
- Add `group_id` column to `res_openwater` table
- Create foreign key relationship to `buoy_group.id`
- Add index for better query performance
- Backfill existing reservations with their group assignments
- Add proper documentation

### 4. Usage in code
After applying the migration, you can use the `group_id` field in your queries:

```typescript
// Example: Get reservation with its group information
const { data } = await supabase
  .from('res_openwater')
  .select(`
    *,
    buoy_group!inner(
      id,
      buoy_name,
      boat,
      time_period
    )
  `)
  .eq('uid', userId)
  .eq('res_date', selectedDate);
```

### 5. Benefits
- Direct relationship between reservations and buoy groups
- Better query performance with indexed foreign key
- Easier to track which group a reservation belongs to
- Maintains data integrity with foreign key constraints
