# Auto-Pair Feature for Open Water Reservations

## Overview
The Open Water Reservation System includes an Auto-Pair feature that intelligently matches reservation requests based on depth, equipment preferences, and buddy relationships. When a reservation request is submitted and approved by an admin, the system automatically pairs divers with compatible partners.

## Core Algorithm (from /old_app/src/lib/autoAssign/)

### Key Files:
- **`createBuoyGroups.ts`** - Core pairing logic and depth compatibility
- **`assignRsvsToBuoys.ts`** - Buoy assignment with equipment matching
- **`assignHourlySpacesWithBreaks.ts`** - Space optimization algorithms
- **`hourlyUtils.ts`** - Helper functions for grouping and assignments

### Pairing Strategy:

#### 1. **Buddy Group Formation**
- Groups divers who are manually SELECTED buddies 
- Respects pre-assigned buoy preferences
- Sorts groups by depth (deepest to shallowest)

#### 2. **Depth Compatibility**
- **Threshold**: Avoids pairing divers with >15m depth difference
- **Exact Match Priority**: Prefers same depth matches first
- **Auto-adjust Option**: If no exact match, pairs with nearest available depth
- **Fallback Logic**: If no compatible depth, creates solo group

#### 3. **Equipment Matching**
- **Pulley Preference**: Matches divers who want/don't want pulleys
- **Bottom Plate**: Groups divers needing bottom plate equipment  
- **Large Buoy**: Matches divers requiring large buoy
- **Buoy Constraints**: CBS/PRO_SAFETY buoys must match exactly

#### 4. **Group Size Optimization**
- **Ideal Size**: 2-3 divers per buoy
- **Course Groups**: Courses and 3+ buddy groups get dedicated buoys
- **Solo Divers**: Attempts to pair with existing groups when possible
- **Force Pairing**: Solo divers without matches get their own buoy

### Algorithm Flow:

```
1. Create Buddy Groups
   ├── Group manually selected buddies
   ├── Respect pre-assigned buoys
   └── Sort by depth (deepest first)

2. Form Buoy Groups (2-3 divers optimal)
   ├── Try exact depth matches first
   ├── Check depth compatibility (≤15m difference)
   ├── Verify buoy constraints (CBS/PRO_SAFETY)
   └── Fallback to nearest depth if auto-adjust enabled

3. Assign to Buoys
   ├── Handle pre-assigned buoys first
   ├── Match equipment preferences
   ├── Optimize for depth compatibility
   └── Minimize equipment mismatches

4. Space Optimization
   ├── Minimize path breaks
   ├── Try multiple orderings (up to 100 trials)
   ├── Break up large groups if necessary
   └── Ensure all divers get assigned
```

## Database Structure

### Current Schema (Enhanced):
```sql
-- Main reservations table
reservations (
  uid uuid references user_profiles(uid),
  res_date timestamptz,
  res_type reservation_type,
  res_status reservation_status,
  title text,
  description text,
  admin_notes text,
  approved_by uuid references user_profiles(uid),
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  
  -- Auto-pairing fields
  depth_m integer,
  auto_adjust_closest boolean default false,
  paired_uid uuid references user_profiles(uid),
  paired_at timestamptz,
  
  PRIMARY KEY (uid, res_date)
);
```

### Proposed Enhanced Schema:
```sql
-- Main reservations table (simplified)
reservations (
  uid uuid references user_profiles(uid),
  res_date timestamptz,
  res_type reservation_type,
  approved_by uuid references user_profiles(uid),
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  PRIMARY KEY (uid, res_date)
);

-- Pool reservations
res_pool (
  uid uuid references user_profiles(uid),
  res_date timestamptz,
  start_time time,
  end_time time,
  lane text,
  note text,
  PRIMARY KEY (uid, res_date)
);

-- Open water reservations  
res_openwater (
  uid uuid references user_profiles(uid),
  res_date timestamptz,
  time_period text, -- 'AM' or 'PM'
  depth_m integer,
  buoy text,
  auto_adjust_closest boolean default false,
  paired_uid uuid references user_profiles(uid),
  paired_at timestamptz,
  pulley boolean,
  bottom_plate boolean,
  large_buoy boolean,
  PRIMARY KEY (uid, res_date)
);

-- Classroom reservations
res_classroom (
  uid uuid references user_profiles(uid),
  res_date timestamptz,
  start_time time,
  end_time time,
  room text,
  note text,
  PRIMARY KEY (uid, res_date)
);
```

## Implementation Features

### User Interface:
- **Auto-adjust Checkbox**: "Auto-adjust to closest depth if no similar buddy available"
- **Pairing Display**: Shows paired buddy's name and reservation details
- **Status Indicators**: Visual feedback for pairing status

### Admin Features:
- **Manual Override**: Admins can manually pair/unpair divers
- **Pairing Reports**: View all auto-paired groups
- **Conflict Resolution**: Handle pairing conflicts and edge cases

### System Logic:
- **Trigger on Approval**: Auto-pairing happens when admin approves reservation
- **Depth Matching**: Exact depth match preferred, then nearest available
- **Equipment Compatibility**: Ensures equipment preferences are respected
- **Buoy Constraints**: Handles special buoy requirements (CBS, PRO_SAFETY)

## Technical Implementation

### Database Functions:
```sql
-- Auto-pairing trigger function
CREATE OR REPLACE FUNCTION auto_pair_open_water()
RETURNS TRIGGER AS $$
-- Implementation of pairing algorithm
$$;

-- Get pairing details for user
CREATE OR REPLACE FUNCTION get_open_water_pairs_for_me()
RETURNS TABLE (
  requester_uid uuid,
  paired_uid uuid,
  paired_name text,
  paired_depth_m integer,
  paired_at timestamptz
);
```

### API Endpoints:
- `POST /api/auto-pair` - Trigger auto-pairing for approved reservation
- `GET /api/pairs/{uid}` - Get pairing details for user
- `POST /api/pairs/manual` - Manual pairing by admin
- `DELETE /api/pairs/{uid}` - Unpair divers

## Benefits

1. **Improved Safety**: Divers are paired with compatible depth partners
2. **Better Resource Utilization**: Optimal buoy assignments reduce conflicts
3. **Enhanced User Experience**: Automatic pairing reduces manual coordination
4. **Equipment Optimization**: Matches divers with similar equipment needs
5. **Flexible Pairing**: Auto-adjust option handles edge cases gracefully

## Future Enhancements

- **Skill Level Matching**: Pair divers with similar experience levels
- **Language Preferences**: Match divers who speak the same language
- **Equipment Sharing**: Optimize equipment usage across pairs
- **Historical Pairing**: Learn from successful past pairings
- **Mobile Notifications**: Notify users when they get paired

