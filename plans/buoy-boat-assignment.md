# Buoy and Boat Assignment System Guide

## Overview

The buoy and boat assignment system automatically groups divers and assigns them to buoys based on depth compatibility, buddy relationships, and equipment requirements. This system operates in two phases: **Buoy Assignment** (automatic) and **Boat Assignment** (manual admin control).

---

## 🏊‍♂️ Phase 1: Buoy Assignment (Automatic)

### Core Principles

1. **Buddy Relationships**: Divers who want to dive together are kept together
2. **Depth Compatibility**: Divers with similar depths (within 15m) are grouped
3. **Equipment Matching**: Buoys are matched to diver equipment needs
4. **Session Separation**: AM and PM sessions are processed independently
5. **Course Isolation**: Course divers get dedicated buoys

### Assignment Algorithm

#### Step 1: Buddy Grouping
```
Input: List of Open Water reservations for AM/PM
Process: Group divers by buddy relationships and pre-assigned buoys
Output: Buddy groups (1-3 divers each)
```

**Grouping Rules:**
- Divers who specify each other as buddies → Same group
- Divers pre-assigned to same buoy → Same group
- Groups sorted by depth (deepest to shallowest)

#### Step 2: Buoy Group Formation
```
Input: Buddy groups
Process: Combine groups into optimal buoy groups (2-3 divers)
Output: Buoy groups ready for assignment
```

**Formation Rules:**
- **Course reservations**: Get their own buoy (isolated)
- **Groups of 3+ buddies**: Get their own buoy
- **Groups of 1-2 divers**: Combined into groups of 2-3 divers
- **Depth compatibility**: Avoid pairing divers with >15m depth difference
- **Session separation**: Short and long sessions kept separate

#### Step 3: Buoy Selection Algorithm
```
For each buoy group:
1. Filter buoys by depth requirement (buoy.maxDepth >= group.maxDepth)
2. Match equipment needs (pulley, bottomPlate, largeBuoy)
3. Prioritize course preferences (no-pulley for courses)
4. Select buoy with fewest unused features
5. Assign group to selected buoy
```

**Selection Criteria (in priority order):**
1. **Pre-assigned buoys** (highest priority)
2. **Depth requirement** (buoy.maxDepth >= group.maxDepth)
3. **Equipment matching** (pulley, bottomPlate, largeBuoy)
4. **Course preferences** (no-pulley for courses)
5. **Minimal waste** (fewest unused features)

### Equipment Matching

| Equipment | Purpose | Priority |
|-----------|---------|----------|
| **Pulley** | Deep dives (15m+) | High |
| **Bottom Plate** | Platform dives | Medium |
| **Large Buoy** | CBS dives (90-130m) | High |
| **No Pulley** | Course dives | High (courses only) |

### Depth Compatibility Rules

```typescript
const maxDepthDiff = 15; // meters

// Compatible: 20m diver + 30m diver (10m difference)
// Incompatible: 20m diver + 50m diver (30m difference)
```

**Grouping Logic:**
- Divers within 15m depth range → Same buoy group
- Divers with >15m difference → Separate groups when possible
- If no better option available → May still be grouped together

---

## 🚤 Phase 2: Boat Assignment (Manual)

### Admin-Controlled Assignment

Boat assignment is **manually controlled by admins** through the admin dashboard.

#### Assignment Process
1. **View Buoy Groups**: Admin sees all buoy groups for a date
2. **Select Boat**: Admin assigns a boat to each buoy
3. **Save Assignment**: Assignment is saved to database
4. **Flexible Updates**: Admin can reassign boats as needed

#### Boat Assignment Structure
```javascript
const boatAssignments = {
    "Buoy1": "Boat A",
    "Buoy2": "Boat B", 
    "Buoy3": null,  // No boat assigned
    "Buoy4": "Boat C"
};
```

#### Assignment Rules
- **One boat per buoy**: Each buoy can only be assigned to one boat
- **Multiple buoys per boat**: One boat can serve multiple buoys
- **Optional assignment**: Buoys can have no boat assigned
- **Flexible reassignment**: Admins can change assignments anytime

---

## 📊 Assignment Priorities

### Buoy Assignment Priority (Automatic)
1. **Pre-assigned buoys** (divers who specified a buoy)
2. **Course reservations** (get dedicated buoys)
3. **Buddy relationships** (keep buddies together)
4. **Depth compatibility** (similar depths together)
5. **Equipment matching** (optimal buoy features)
6. **Minimal waste** (fewest unused features)

### Boat Assignment Priority (Manual)
1. **Operational requirements** (boat availability, capacity)
2. **Safety considerations** (weather, conditions)
3. **Efficiency** (minimize boat trips)
4. **Admin discretion** (flexible decision-making)

---

## 🎯 Group Formation Examples

### Example 1: Course Divers
```
Input: 2 course divers (20m, 25m depth)
Result: 2 separate buoy groups (courses get isolation)
```

### Example 2: Buddy Pair
```
Input: 2 buddies (30m, 35m depth)
Result: 1 buoy group with both divers
```

### Example 3: Solo Diver
```
Input: 1 solo diver (40m depth)
Result: Combined with compatible group or separate group
```

### Example 4: Large Buddy Group
```
Input: 4 buddies (25m, 30m, 35m, 40m depth)
Result: 1 buoy group (3+ buddies get dedicated buoy)
```

---

## 🔄 System Workflow

### Daily Assignment Process
1. **Load Reservations**: Get all Open Water reservations for date
2. **Filter by Time**: Separate AM and PM reservations
3. **Create Buddy Groups**: Group divers by buddy relationships
4. **Form Buoy Groups**: Combine groups into optimal buoy groups
5. **Assign Buoys**: Match groups to available buoys
6. **Update Database**: Save buoy assignments
7. **Admin Review**: Admin reviews and assigns boats
8. **Final Assignment**: Complete assignment with boats

### Admin Controls
- **Lock/Unlock**: Lock assignments or allow auto-adjustment
- **Manual Override**: Manually reassign buoys
- **Boat Assignment**: Assign boats to buoys
- **Comments**: Add notes per buoy/time slot
- **Refresh**: Reload assignments and data

---

## 📋 Assignment Rules Summary

### Buoy Assignment Rules
- ✅ **Buddy relationships** are preserved
- ✅ **Depth compatibility** (within 15m) is prioritized
- ✅ **Course divers** get dedicated buoys
- ✅ **Equipment needs** are matched to buoy capabilities
- ✅ **AM/PM sessions** are processed separately
- ✅ **Pre-assigned buoys** are respected

### Boat Assignment Rules
- ✅ **Admin-controlled** assignment process
- ✅ **Flexible** boat-to-buoy mapping
- ✅ **Optional** boat assignment (buoys can have no boat)
- ✅ **Reassignable** at any time
- ✅ **Operational** considerations (capacity, availability)

---

## 🎛️ Admin Dashboard Features

### Buoy Management
- **View Assignments**: See all buoy groups and assignments
- **Manual Override**: Reassign divers to different buoys
- **Lock Assignments**: Prevent automatic reassignment
- **Comments**: Add notes per buoy/time slot

### Boat Management
- **Assign Boats**: Select boat for each buoy
- **View Capacity**: See boat capacity and current assignments
- **Reassign**: Change boat assignments as needed
- **Unassign**: Remove boat assignment from buoy

### System Controls
- **Refresh Data**: Reload all assignments and data
- **Auto-Assign**: Trigger automatic buoy assignment
- **Lock/Unlock**: Control automatic assignment
- **Export**: Export assignment data

---

## 🔧 Technical Implementation

### Database Structure
```sql
-- Buoy assignments stored in reservations table
reservations.buoy = "Buoy1" | "auto" | null

-- Boat assignments stored separately
boat_assignments.date = "2024-01-15"
boat_assignments.assignments = {"Buoy1": "Boat A", "Buoy2": "Boat B"}
```

### API Endpoints
- `POST /api/lockBuoyAssignments` - Lock/unlock buoy assignments
- `POST /api/assignBuoysToBoats` - Assign boats to buoys
- `GET /api/getBoatAssignments` - Get current boat assignments

### Assignment Algorithm
```typescript
// Core assignment function
assignRsvsToBuoys(buoys: Buoys[], rsvs: Submission[]) {
    // 1. Create buddy groups
    // 2. Form buoy groups
    // 3. Assign groups to buoys
    // 4. Return assignments
}
```

---

This system ensures optimal grouping of divers while respecting buddy relationships, depth compatibility, and equipment requirements, with flexible admin controls for boat assignments.
