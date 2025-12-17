# Pool Collision Detection

## Overview
This document outlines the logic for detecting collisions when creating or updating pool reservations.

## Key Requirements
- Prevent overlapping reservations in the same lane and the same time slots with 30min cell or units
- Consider student count when determining lane availability
- Support reservation updates without conflicting with self

## Core Logic
The collision detection should check for existing reservations that overlap in time and lane within the same pool.

### Reservation Cells
Each reservation occupies a set of 30-minute time cells based on its start and end times.
Some reservations may even span to multiple time cells and lane columns.

ie:
Only Reservation: Lane 1: 10:00-11:30
cells [[10:00, 10:30, 11:00]] - index 0 on first array because of lane 1, and the time it has on that lane (10:00, 10:30, 11:00)
```js
reservationCells = [
    ['10:00', '10:30', '11:00'], 
    [],
    [],
    [],
    [],
    [],
    [],
    []
]
```

Only Reservation: Lane 2: 10:30-12:00
cells [[],[10:30, 11:00, 11:30]] - index 1 on first array because of lane 2, and the time it has on that lane (10:30, 11:00, 11:30)
```js
reservationCells = [
    [], 
    ['10:30', '11:00', '11:30'],
    [],
    [],
    [],
    [],
    [],
    []
]
```

3 Reservation Example: 
- Reservation 1: Lane 1: 10:00-11:30
- Reservation 2: Lane 2: 10:30-12:00
- Reservation 3: Lane 2: 13:00-14:30
```js
reservationCells = [
    ['10:00', '10:30', '11:00'], 
    ['10:30', '11:00', '11:30', '13:00', '13:30', '14:00'],
    [],
    [],
    [],
    [],
    [],
    []
]
```


### Process Overview

#### New Reservation
1. Generate cells for the new reservation
2. Check existing reservations for overlapping cells
3. Return collision if any overlap found

#### Update Reservation
1. Generate cells for the updated reservation
2. Check existing reservations (excluding the reservation being updated) for overlapping cells
3. Return collision if any overlap found



