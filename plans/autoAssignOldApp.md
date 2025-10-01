# Auto-Assignment System in Old App

## Overview

The auto-assignment system in the old app automatically groups divers and assigns them to buoys based on depth compatibility, buddy relationships, and equipment requirements. The system uses two main database tables: **Buoys** and **buoyGroupings** (implicit through the grouping logic).

## Database Tables

### Buoys Table
```typescript
{
  name: string;           // Buoy identifier (e.g., "Buoy1", "Buoy2")
  maxDepth: int;          // Maximum depth the buoy can handle
  pulley: bool;           // Whether buoy has pulley equipment
  extraBottomWeight: bool; // Whether buoy has extra bottom weight
  bottomPlate: bool;      // Whether buoy has bottom plate
  largeBuoy: bool;        // Whether buoy is large size
}
```

### Buoy Groupings (Implicit)
The system creates buoy groupings dynamically based on:
- **Buddy relationships** (divers who want to dive together)
- **Depth compatibility** (max depth difference ≤ 15 meters)
- **Session type separation** (short vs long sessions)
- **Equipment requirements** (pulley, bottom plate, large buoy)

## Core Algorithm

### 1. Group Creation Phase (`createBuoyGroups.ts`)

#### **Buddy Grouping**
```typescript
function createBuddyGroups(rsvs: Submission[]) {
  // Groups divers by:
  // 1. Buddy relationships (a.buddies.includes(b.user.id))
  // 2. Pre-assigned same buoy (a.buoy == b.buoy && a.buoy != 'auto')
}
```

#### **Depth-Based Grouping**
```typescript
const maxDepthDiff = 15; // Maximum depth difference between divers in same group

function largeDepthDifference(deepBg: Submission[], shallowBg: Submission[], threshold: number) {
  let deepBgMax = deepBg[0].maxDepth;
  let shallowBgMin = shallowBg[shallowBg.length - 1].maxDepth;
  return deepBgMax - shallowBgMin >= threshold;
}
```

#### **Group Size Optimization**
- **Course reservations**: Always get their own buoy (regardless of group size)
- **Groups of 3+ divers**: Get their own buoy
- **Groups of 1-2 divers**: Combined to form groups of 2-3 divers
- **Solo divers**: Added to existing groups or form groups of 1

### 2. Buoy Assignment Phase (`assignRsvsToBuoys.ts`)

#### **Pre-Assigned Buoys**
```typescript
function assignPreAssigned(buoys: Buoys[], grps: Submission[][], assignments: { [buoyName: string]: Submission[] }) {
  // Handle divers who have specific buoy preferences
  // Remove assigned buoys and groups from available pools
}
```

#### **Automatic Assignment Algorithm**
```typescript
function assignAuto(buoys: Buoys[], grps: Submission[][], assignments: { [buoy: string]: Submission[] }) {
  // Sort buoys from deep to shallow
  buoys.sort((a, b) => b.maxDepth! - a.maxDepth!);
  
  // Sort groups from shallow to deep
  grps.sort((a, b) => a[0].maxDepth - b[0].maxDepth);
  
  // For each group, find optimal buoy based on:
  // 1. Depth compatibility (buoy.maxDepth >= group.maxDepth)
  // 2. Equipment matching (pulley, bottomPlate, largeBuoy)
  // 3. Fewest extra options
  // 4. Closest depth match
}
```

## Equipment Matching Logic

### **Group Equipment Requirements**
```typescript
function getGroupOpts(grp: Submission[]) {
  let grpOpts = {
    pulley: null,        // null = no preference, false = don't want, true = want
    bottomPlate: false,
    largeBuoy: false
  };
  
  // If ANY diver in group wants equipment, group wants it
  for (let rsv of grp) {
    grpOpts.pulley = grpOpts.pulley || rsv.pulley;
    grpOpts.bottomPlate = grpOpts.bottomPlate || rsv.bottomPlate;
    grpOpts.largeBuoy = grpOpts.largeBuoy || rsv.largeBuoy;
  }
}
```

### **Buoy Matching Score**
```typescript
function countMatches(buoy: Buoys, opts: BuoyOpts) {
  let m = 0;
  if (buoy.pulley && opts.pulley) m++;
  if (buoy.bottomPlate && opts.bottomPlate) m++;
  if (buoy.largeBuoy && opts.largeBuoy) m++;
  return m;
}
```

## Assignment Priority Rules

### **1. Depth Compatibility**
- Buoy must have `maxDepth >= group.maxDepth`
- If no suitable buoy exists, assign to deepest available buoy

### **2. Equipment Matching**
- **Course reservations**: Prioritize no-pulley buoys if `pulley == false`
- **Option matching**: Choose buoy with most equipment matches
- **Extra options**: Minimize buoys with unrequested equipment

### **3. Depth Optimization**
- Choose buoy with closest `maxDepth` to group requirements
- Avoid assigning shallow groups to unnecessarily deep buoys

## Session Type Separation

### **Short vs Long Sessions**
```typescript
const shortSession = rsvs.filter((rsv) => rsv.shortSession);
const longSession = rsvs.filter((rsv) => !rsv.shortSession);

// Process separately to ensure different time slots
const buoyGrps = [
  ...createBuoyGroups(shortSession, maxDepthDiff),
  ...createBuoyGroups(longSession, maxDepthDiff)
];
```

## Special Cases

### **Course Reservations**
- Always get their own buoy (never grouped with others)
- Prioritize no-pulley buoys if `pulley == false`
- Can have any group size (1, 2, 3+ divers)

### **Solo Divers**
```typescript
const forceAddSoloDiver = (solo: Submission) => {
  // Try to add to existing autonomous groups
  // If no suitable group, create group of 1
  // If group becomes too large, split into smaller groups
};
```

### **Buoy Consistency**
```typescript
const buoysMatch = (bgA: Submission[], bgB: Submission[]) => {
  let buoyA = bgA[0].buoy;
  let buoyB = bgB[0].buoy;
  
  // Special buoys (CBS, PRO_SAFETY) must match exactly
  if ([buoyA, buoyB].includes('CBS') || [buoyA, buoyB].includes('PRO_SAFETY')) {
    return buoyA === buoyB;
  } else {
    return buoyA === 'auto' || buoyB === 'auto' || buoyA === buoyB;
  }
};
```

## API Integration

### **Lock Buoy Assignments** (`/api/lockBuoyAssignments`)
```typescript
export async function POST({ request }) {
  let { lock, date } = await request.json();
  
  if (lock) {
    // Run auto-assignment for AM and PM sessions separately
    for (let owTime of ['AM', 'PM']) {
      const { assignments } = assignRsvsToBuoys(
        buoys,
        rsvs.filter((rsv) => rsv.owTime === owTime)
      );
      
      // Update reservations with assigned buoys
      for (const buoy of buoys) {
        let toAsn = assignments[buoy.name];
        if (toAsn != undefined) {
          updates.push(...toAsn.map((rsv) => ({ id: rsv.id, buoy: buoy.name })));
        }
      }
    }
  } else {
    // Reset all assignments to 'auto'
    rsvs.forEach((rsv) => updates.push({ id: rsv.id, buoy: 'auto' }));
  }
}
```

## Algorithm Complexity

### **Time Complexity**
- **Group Creation**: O(n²) where n = number of reservations
- **Buoy Assignment**: O(m×g) where m = number of buoys, g = number of groups
- **Overall**: O(n² + m×g)

### **Space Complexity**
- **Group Storage**: O(n) for storing groups
- **Assignment Storage**: O(n) for assignments
- **Overall**: O(n)

## Key Features

### **1. Depth-Based Safety**
- Ensures divers with similar depth capabilities are grouped together
- Prevents dangerous depth mismatches (max 15m difference)

### **2. Buddy System**
- Respects buddy relationships and preferences
- Maintains buddy groups throughout the assignment process

### **3. Equipment Optimization**
- Matches equipment requirements to available buoy capabilities
- Minimizes waste of specialized equipment

### **4. Session Separation**
- Keeps short and long sessions on separate buoys
- Prevents scheduling conflicts

### **5. Flexible Assignment**
- Handles pre-assigned buoys
- Falls back gracefully when ideal assignments aren't possible
- Supports solo divers and large groups

## Usage Example

```typescript
// Get available buoys
const buoys = await getBuoys();

// Get reservations for a specific date
const rsvs = await getReservationsByDate(date);

// Run auto-assignment
const { assignments, unassigned } = assignRsvsToBuoys(buoys, rsvs);

// assignments = { "Buoy1": [diver1, diver2], "Buoy2": [diver3] }
// unassigned = [diver4] // if no suitable buoy available
```

This system ensures optimal buoy utilization while maintaining safety standards and respecting diver preferences.
