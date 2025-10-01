# Automatic Buoy Assignment System

## Overview

The automatic buoy assignment system intelligently groups divers and assigns them to buoys based on depth compatibility, buddy relationships, equipment requirements, and session types. This system operates in two main phases: **Group Creation** and **Buoy Assignment**.

## System Architecture

### Core Components

1. **`createBuoyGroups.ts`** - Groups divers based on depth compatibility and buddy relationships
2. **`assignRsvsToBuoys.ts`** - Assigns groups to optimal buoys based on depth and equipment requirements
3. **`assignHourlySpacesWithBreaks.ts`** - Handles time slot assignments for pool sessions

## Phase 1: Group Creation

### Depth Compatibility Algorithm

**Key Parameter:**
- **`maxDepthDiff = 15` meters** - Maximum depth difference allowed between divers in the same group

```typescript
const largeDepthDifference = (deepBg: Submission[], shallowBg: Submission[], threshold: number) => {
    let deepBgMax = deepBg[0].maxDepth;        // Deepest diver in group
    let shallowBgMin = shallowBg[shallowBg.length - 1].maxDepth;  // Shallowest diver in group
    return deepBgMax - shallowBgMin >= threshold;  // Returns true if difference >= 15m
};
```

### Grouping Process

#### Step 1: Create Buddy Groups
- Groups divers who are buddies or pre-assigned to the same buoy
- Sorts groups by depth (deepest to shallowest)
- Preserves existing buddy relationships

#### Step 2: Combine Compatible Groups
- **Target group size**: 2-3 divers per buoy (optimal)
- **Depth compatibility**: Only combine groups if depth difference < 15 meters
- **Special cases**:
  - **Courses**: Get their own buoy (no mixing with other groups)
  - **Large groups (3+ divers)**: Get their own buoy
  - **Solo divers**: Try to pair with compatible groups

#### Step 3: Smart Grouping Logic
```typescript
// Recursive algorithm to find optimal group combinations
const matchOne = (curBg: Submission[], searchIdx: number, diffThresh: number) => {
    // Try to create groups of 2-3 divers
    // Avoid combining groups with large depth differences
    // Prefer groups with similar depth ranges
};
```

### Grouping Rules

1. **Depth Compatibility**
   - Divers with depth differences > 15m are not grouped together
   - Groups are sorted by depth (deepest to shallowest)
   - Solo divers are matched with compatible existing groups

2. **Buddy System**
   - Divers who are buddies stay together
   - Pre-assigned buoy groups are preserved
   - Buddy relationships take priority over depth compatibility

3. **Special Group Types**
   - **Course groups**: Always get their own buoy
   - **Large groups (3+ divers)**: Get their own buoy
   - **Solo divers**: Attempted to pair with compatible groups

## Phase 2: Buoy Assignment

### Session Type Separation

```typescript
// Separate short and long sessions to prevent conflicts
const shortSession = rsvs.filter((rsv) => rsv.shortSession);
const longSession = rsvs.filter((rsv) => !rsv.shortSession);
```

### Buoy Selection Algorithm

#### Step 1: Depth Requirements
- Buoy's `maxDepth >= group's maxDepth`
- Groups are sorted from shallow to deep
- Buoys are sorted from deep to shallow

#### Step 2: Equipment Matching
```typescript
function countMatches(buoy: Buoys, opts: BuoyOpts) {
    let m = 0;
    if (buoy.pulley && opts.pulley) m++;
    if (buoy.bottomPlate && opts.bottomPlate) m++;
    if (buoy.largeBuoy && opts.largeBuoy) m++;
    return m;
}
```

#### Step 3: Optimal Selection
For each group, the system:

1. **Filters by depth**: Only considers buoys deep enough for the group
2. **Counts option matches**: Prefers buoys with more matching equipment
3. **Minimizes extra options**: Chooses buoy with fewest unwanted features
4. **Handles special requests**: Prioritizes no-pulley requests for courses

### Assignment Algorithm

```typescript
function assignAuto(buoys: Buoys[], grps: Submission[][], assignments: { [buoy: string]: Submission[] }) {
    // Sort buoys from deep to shallow
    buoys.sort((a, b) => b.maxDepth! - a.maxDepth!);
    // Sort groups from shallow to deep (iterate backwards)
    grps.sort((a, b) => a[0].maxDepth - b[0].maxDepth);

    while (grps.length > 0) {
        let grp = grps[grps.length - 1];
        let grpMaxDepth = grp[0].maxDepth;
        let grpOpts = getGroupOpts(grp);
        
        // Find optimal buoy for this group
        let candidates = buoys.map((buoy, idx) => ({ buoy, idx }));
        let deepEnough = candidates.filter((cand) => cand.buoy.maxDepth! >= grpMaxDepth);
        
        if (deepEnough.length > 0) {
            // Choose buoy with most option matches and fewest extra options
            // Handle special requests (no-pulley for courses)
            // Select optimal buoy
        }
    }
}
```

## Equipment Requirements

### Buoy Features
- **Pulley**: For deep dives and course requirements
- **Bottom Plate**: For specific dive types
- **Large Buoy**: For larger groups or special requirements

### Group Preferences
```typescript
function getGroupOpts(grp: Submission[]) {
    let grpOpts: { [key: string]: boolean | null } = {
        pulley: null,        // null = "no preference", false = "don't want", true = "want"
        bottomPlate: false,
        largeBuoy: false
    };
    
    for (let rsv of grp) {
        grpOpts.pulley = grpOpts.pulley || rsv.pulley;
        grpOpts.bottomPlate = grpOpts.bottomPlate || rsv.bottomPlate;
        grpOpts.largeBuoy = grpOpts.largeBuoy || rsv.largeBuoy;
    }
    return grpOpts;
}
```

## Example Scenarios

### Scenario 1: Compatible Depths
- **Diver A**: 30m max depth
- **Diver B**: 25m max depth  
- **Result**: Grouped together (5m difference < 15m threshold)

### Scenario 2: Incompatible Depths
- **Diver A**: 40m max depth
- **Diver B**: 20m max depth
- **Result**: Separate groups (20m difference > 15m threshold)

### Scenario 3: Course Group
- **4 divers in a course**
- **Result**: Gets their own buoy (courses don't mix with other groups)

### Scenario 4: Buddy System
- **Diver A & B**: Buddies with 25m and 30m max depths
- **Result**: Grouped together despite 5m difference (buddy relationship takes priority)

## Safety Considerations

### Depth Compatibility
- Prevents divers with vastly different depth capabilities from being paired
- 15-meter threshold ensures safe diving practices
- Deepest diver in group determines minimum buoy depth requirement

### Equipment Matching
- Ensures buoy has required equipment for the group
- Handles special requirements (no-pulley for courses)
- Matches buoy size to group size

### Session Management
- Separates short and long sessions to prevent conflicts
- Maintains proper time slot assignments
- Prevents overbooking of buoys

## Benefits

1. **Safety**: Prevents incompatible depth pairings
2. **Efficiency**: Optimizes buoy usage by matching groups to appropriate buoys
3. **Flexibility**: Handles buddy relationships and special requirements
4. **Equipment Optimization**: Matches buoy features to group needs
5. **Session Management**: Separates different session types to avoid conflicts
6. **Automation**: Reduces manual assignment workload for administrators

## Configuration Parameters

### Depth Compatibility
- **`maxDepthDiff = 15` meters**: Maximum depth difference between divers in same group

### Group Sizes
- **Optimal**: 2-3 divers per buoy
- **Maximum**: 4 divers per buoy (rare cases)
- **Minimum**: 1 diver per buoy (solo divers)

### Special Cases
- **Courses**: Always get their own buoy
- **Large groups (3+)**: Get their own buoy
- **Solo divers**: Attempted pairing with compatible groups

## Implementation Files

### Core Files
- **`createBuoyGroups.ts`**: Main grouping algorithm
- **`assignRsvsToBuoys.ts`**: Buoy assignment algorithm
- **`assignHourlySpacesWithBreaks.ts`**: Time slot management

### Supporting Files
- **`createBuddyGroups.ts`**: Buddy relationship handling
- **`assignHourlySpaces.ts`**: Pool session assignments
- **`oldAssignPoolSpaces.ts`**: Legacy pool assignment logic

## Future Enhancements

1. **Machine Learning**: Learn from historical assignments to improve matching
2. **Real-time Updates**: Dynamic reassignment based on cancellations
3. **Advanced Preferences**: More granular equipment and location preferences
4. **Conflict Resolution**: Better handling of edge cases and conflicts
5. **Performance Optimization**: Faster algorithms for large datasets

---

*This system ensures that divers are grouped with others of similar depth capabilities while maximizing buoy utilization and respecting buddy relationships and special equipment requirements.*
