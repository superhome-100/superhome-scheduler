# Reservation CRUD API Documentation

## Overview

This document describes the comprehensive CRUD (Create, Read, Update, Delete) API system for managing reservations in the SuperHOME Scheduler application. The system is built with TypeScript and provides type-safe operations for all reservation types.

## Architecture

The reservation system uses a **layered architecture**:

```
┌─────────────────────────────────────┐
│           Svelte Components         │
├─────────────────────────────────────┤
│         Reservation Store           │ (Reactive state management)
├─────────────────────────────────────┤
│         Reservation API             │ (High-level API client)
├─────────────────────────────────────┤
│       Reservation Service           │ (Core business logic)
├─────────────────────────────────────┤
│      Validation Utils               │ (Data validation)
├─────────────────────────────────────┤
│         Supabase Client             │ (Database operations)
└─────────────────────────────────────┘
```

## Database Schema

### Core Tables

1. **`reservations`** - Parent table
   - `uid` (uuid) - User ID
   - `res_date` (timestamptz) - Reservation date/time
   - `res_type` (enum) - 'pool', 'open_water', 'classroom'
   - `res_status` (enum) - 'pending', 'confirmed', 'rejected'

2. **`res_pool`** - Pool reservation details
   - `uid`, `res_date` (composite key)
   - `start_time`, `end_time` (time)
   - `lane` (text, optional)
   - `note` (text, optional)

3. **`res_classroom`** - Classroom reservation details
   - `uid`, `res_date` (composite key)
   - `start_time`, `end_time` (time)
   - `room` (text, optional)
   - `note` (text, optional)

4. **`res_openwater`** - Open water reservation details
   - `uid`, `res_date` (composite key)
   - `time_period` (text)
   - `depth_m` (integer, optional)
   - `buoy` (text, optional)
   - `group_id` (integer, optional)
   - Equipment flags: `pulley`, `deep_fim_training`, `bottom_plate`, `large_buoy`
   - `open_water_type` (text, optional)
   - `student_count` (integer, optional)
   - `note` (text, optional)

## API Reference

### ReservationService (Core Service)

The core service provides low-level database operations.

#### Create Reservation

```typescript
const result = await reservationService.createReservation(uid, {
  res_type: 'pool',
  res_date: '2024-01-15T10:00:00Z',
  pool: {
    start_time: '10:00',
    end_time: '11:00',
    lane: 'Lane 1',
    note: 'Swimming practice'
  }
});
```

#### Read Reservations

```typescript
// Get all reservations for a user
const result = await reservationService.getReservations({
  uid: 'user-id',
  order_by: 'res_date',
  order_direction: 'asc'
});

// Get reservations by status
const pending = await reservationService.getReservationsByStatus('pending');

// Get upcoming reservations
const upcoming = await reservationService.getUpcomingReservations(uid, 10);
```

#### Update Reservation

```typescript
const result = await reservationService.updateReservation(uid, res_date, {
  res_status: 'confirmed',
  pool: {
    lane: 'Lane 2'
  }
});
```

#### Delete Reservation

```typescript
const result = await reservationService.deleteReservation(uid, res_date);
```

### ReservationApi (High-Level API)

The high-level API provides validation, error handling, and data transformation.

#### Basic Operations

```typescript
import { reservationApi } from '../api/reservationApi';

// Create with validation
const result = await reservationApi.createReservation(uid, reservationData);

// Update with validation
const result = await reservationApi.updateReservation(uid, res_date, updateData);

// Delete
const result = await reservationApi.deleteReservation(uid, res_date);
```

#### Status Management

```typescript
// Update status
await reservationApi.updateReservationStatus(uid, res_date, 'confirmed');

// Approve reservation
await reservationApi.approveReservation(uid, res_date);

// Reject reservation
await reservationApi.rejectReservation(uid, res_date);

// Bulk status update
await reservationApi.bulkUpdateStatus(reservations, 'confirmed');
```

### ReservationStore (Reactive State)

The store provides reactive state management for Svelte components.

#### Basic Usage

```svelte
<script>
  import { reservationStore, upcomingReservations, reservationStats } from '../stores/reservationStore';
  
  // Load user reservations
  onMount(async () => {
    if ($authStore.user) {
      await reservationStore.loadUserReservations($authStore.user.id);
    }
  });
</script>

<!-- Display reservations -->
{#each $upcomingReservations as reservation}
  <div class="reservation-card">
    <h3>{reservation.res_type}</h3>
    <p>{reservation.res_date}</p>
  </div>
{/each}

<!-- Display stats -->
<div class="stats">
  <div>Total: {$reservationStats.total}</div>
  <div>Pending: {$reservationStats.pending}</div>
</div>
```

#### Store Methods

```typescript
// Load data
await reservationStore.loadUserReservations(uid);
await reservationStore.loadUpcomingReservations(uid, 10);
await reservationStore.loadPastReservations(uid, 10);
await reservationStore.loadReservationsByStatus('pending', 50);

// CRUD operations
await reservationStore.createReservation(uid, data);
await reservationStore.updateReservation(uid, res_date, updateData);
await reservationStore.deleteReservation(uid, res_date);

// Status updates
await reservationStore.approveReservation(uid, res_date);
await reservationStore.rejectReservation(uid, res_date);
await reservationStore.bulkUpdateStatus(reservations, 'confirmed');
```

#### Derived Stores

```typescript
// Reactive filtered data
$upcomingReservations    // Future reservations
$pastReservations        // Past reservations
$pendingReservations     // Pending status
$confirmedReservations   // Confirmed status
$rejectedReservations    // Rejected status
$poolReservations        // Pool type
$classroomReservations   // Classroom type
$openWaterReservations   // Open water type
$reservationStats        // Statistics object
```

## Data Validation

The system includes comprehensive validation for all reservation types.

### Validation Rules

#### Pool Reservations
- `start_time` and `end_time` are required
- Time format must be HH:MM
- End time must be after start time
- `note` limited to 500 characters

#### Classroom Reservations
- `start_time` and `end_time` are required
- Time format must be HH:MM
- End time must be after start time
- `room` limited to 100 characters
- `note` limited to 500 characters

#### Open Water Reservations
- `time_period` is required (AM, PM, morning, afternoon, evening)
- `depth_m` must be between 0 and 200 meters
- `student_count` required for course_coaching (1-10 students)
- `open_water_type` must be valid (course_coaching, autonomous_buoy, autonomous_platform, autonomous_platform_cbs)
- Equipment flags must be boolean
- `note` limited to 500 characters

### Validation Usage

```typescript
import { validateCreateReservation, validateUpdateReservation } from '../utils/reservationValidation';

// Validate creation data
const validation = validateCreateReservation(reservationData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

// Validate update data
const updateValidation = validateUpdateReservation(updateData);
if (!updateValidation.isValid) {
  console.error('Update validation errors:', updateValidation.errors);
}
```

## Error Handling

All operations return a consistent `ServiceResponse<T>` format:

```typescript
interface ServiceResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
```

### Error Handling Example

```typescript
const result = await reservationApi.createReservation(uid, data);

if (result.success) {
  console.log('Reservation created:', result.data);
} else {
  console.error('Failed to create reservation:', result.error);
  // Handle error appropriately
}
```

## Type Safety

The system provides full TypeScript support with generated types from Supabase.

### Key Types

```typescript
// Reservation types
type ReservationType = 'pool' | 'open_water' | 'classroom';
type ReservationStatus = 'pending' | 'confirmed' | 'rejected';

// Data interfaces
interface CreateReservationData {
  res_type: ReservationType;
  res_date: string;
  res_status?: ReservationStatus;
  pool?: PoolReservationDetails;
  classroom?: ClassroomReservationDetails;
  openwater?: OpenWaterReservationDetails;
}

interface CompleteReservation extends BaseReservation {
  res_pool?: PoolReservationDetails;
  res_classroom?: ClassroomReservationDetails;
  res_openwater?: OpenWaterReservationDetails;
}
```

## Usage Examples

### Complete CRUD Example

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores/auth';
  import { reservationStore, upcomingReservations } from '../stores/reservationStore';
  import type { CreateReservationData } from '../api/reservationApi';

  let showCreateForm = false;
  let createData: CreateReservationData = {
    res_type: 'pool',
    res_date: '',
    pool: {
      start_time: '',
      end_time: '',
      note: ''
    }
  };

  onMount(async () => {
    if ($authStore.user) {
      await reservationStore.loadUserReservations($authStore.user.id);
    }
  });

  const handleCreate = async () => {
    if (!$authStore.user) return;
    
    const result = await reservationStore.createReservation($authStore.user.id, createData);
    if (result.success) {
      showCreateForm = false;
      // Reset form
    }
  };

  const handleDelete = async (reservation: any) => {
    const result = await reservationStore.deleteReservation(reservation.uid, reservation.res_date);
    if (result.success) {
      console.log('Reservation deleted');
    }
  };
</script>

<!-- Display reservations -->
{#each $upcomingReservations as reservation}
  <div class="card">
    <div class="card-body">
      <h3>{reservation.res_type}</h3>
      <p>{new Date(reservation.res_date).toLocaleString()}</p>
      <button on:click={() => handleDelete(reservation)}>Delete</button>
    </div>
  </div>
{/each}

<!-- Create form -->
{#if showCreateForm}
  <div class="modal modal-open">
    <div class="modal-box">
      <form on:submit|preventDefault={handleCreate}>
        <input type="datetime-local" bind:value={createData.res_date} required />
        <input type="time" bind:value={createData.pool.start_time} required />
        <input type="time" bind:value={createData.pool.end_time} required />
        <textarea bind:value={createData.pool.note}></textarea>
        <button type="submit">Create</button>
      </form>
    </div>
  </div>
{/if}
```

## Best Practices

1. **Always use the high-level API** (`reservationApi`) for component operations
2. **Use the reactive store** for state management in Svelte components
3. **Validate data** before sending to the API
4. **Handle errors gracefully** with proper user feedback
5. **Use TypeScript types** for better development experience
6. **Leverage derived stores** for filtered data instead of manual filtering
7. **Use bulk operations** for multiple updates to improve performance

## Migration from Direct Supabase Calls

If you're migrating from direct Supabase calls, replace:

```typescript
// Old way
const { data, error } = await supabase
  .from('reservations')
  .insert(reservationData);

// New way
const result = await reservationApi.createReservation(uid, reservationData);
```

The new system provides:
- ✅ Automatic validation
- ✅ Consistent error handling
- ✅ Type safety
- ✅ Reactive state management
- ✅ Better developer experience
