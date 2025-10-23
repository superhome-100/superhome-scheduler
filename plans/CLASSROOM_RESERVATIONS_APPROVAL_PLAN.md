# How Classroom Reservation Works (End-User to Admin)

This document describes the complete classroom reservation lifecycle, from user request to admin approval with automatic room assignment. It follows our rules: strict typing, strict RLS, pull-to-refresh (no realtime), mobile-first UI with Tailwind + DaisyUI, and ≤300 LOC per file.

---

## 1) Core Concepts

- Business logic keys on `res_type = 'classroom'`. `category` is only a UI label.
- Users create reservations as `pending` without a `room`.
- Admins approve after server-side validations. Approval auto-assigns a free room for the time window and sets `res_status = 'confirmed'`.
- Capacity: currently 3 rooms (`'1' | '2' | '3'`). We will switch to settings-driven rooms/capacity in a follow-up.
- Standard message when full: "No classrooms available for the selected time window".

---

## 2) Data Model

- `reservations` (parent): `uid`, `res_date` (ISO), `res_type`, `res_status` ('pending' | 'confirmed' | 'rejected').
- `res_classroom` (details): `uid`, `res_date`, `start_time`, `end_time`, `room` (nullable), `classroom_type`, `student_count`, `note`.
- On create for classroom: `res_status = 'pending'`, `room = null`.

Types source: `app/src/lib/database.types.ts` (generated). Shared UI messages: `app/src/lib/constants/messages.ts`.

---

## 3) End-User Flow (Create)

UI: `app/src/lib/components/ReservationFormModal/ReservationFormModal.svelte`

1. User selects date, start, end, and classroom fields (e.g., `classroomType`).
2. Client pre-checks capacity and blocks submit:
   - `app/src/lib/utils/availabilityClient.ts`
     - `checkCapacityForForm(formData)` → `checkClassroomCapacity(date, start, end)`
       - Reads `reservations` for the calendar day
       - Counts overlapping classroom reservations with `res_status IN ('pending','confirmed')`, regardless of room
       - Compares against capacity (3)
       - Returns `{ available: false, reason: MSG_NO_CLASSROOMS }` when full
   - The form shows the message in red and disables Submit when unavailable.
3. On submit, the app calls the Edge Function:
   - `app/src/lib/services/reservationService.ts` → `createReservation()`
   - `supabase/functions/reservations-create/index.ts`
     - Validates date-level availability and cutoffs
     - Authoritative classroom capacity check for the timeslot (same logic)
     - If full → 409 with the same standard message
     - Else → inserts parent + classroom details with `res_status = 'pending'` and `room = null`
4. UI shows success toast and marks as Pending. No realtime; users can pull-to-refresh.

Notes:
- A second pre-check path exists via `supabase/functions/availability-check/index.ts` which now supports classroom timeslot capacity. We currently use client-side reads for speed (READ allowed by rules). Either path returns the same message.

---

## 4) Admin Flow (Approve)

UI: `app/src/lib/components/AdminDashboard/AdminDashboard.svelte`

1. Admin sees Pending requests card (`PendingReservations.svelte`) and optionally calendar views.
2. Approve button behavior:
   - For classroom:
     - Calls `app/src/lib/services/reservationService.ts` → `approveReservation(uid, res_date)`
     - `supabase/functions/reservations-approve/index.ts`:
       - Re-reads the target reservation and time window
       - Finds overlapping classroom reservations for the same calendar day and overlapping time
       - Computes `taken` rooms from confirmed overlaps only
       - Picks the first free room from `['1','2','3']`
       - If none → returns 409 with the standard message
       - Else → updates `res_classroom.room` and sets `res_status = 'confirmed'`
   - For non-classroom: uses existing bulk status update flow
3. UI refresh: We use pull-to-refresh or reload the admin data after actions.

---

## 5) Capacity Rules (Current and Future)

- Current (temporary): capacity is 3 rooms: `'1'`, `'2'`, `'3'`.
- Pre-checks (client): count overlaps pending+confirmed by calendar day and timeslot.
- Approval (server): prevents double-booking by selecting a free room among confirmed overlaps; does not block on pending count if a room is free.
- Server create (authoritative): blocks creation if overlaps (pending+confirmed) already fill the capacity.
- Roadmap: replace capacity and room labels with settings-backed values (date-scoped rooms). Update both client pre-check and approval to read from settings.

---

## 6) UX and Messaging

- Disabled Submit when capacity is full.
- Inline alert with red text shows the standard message.
- On server 409, the same message is surfaced.
- Pull-to-refresh enforced, no realtime updates.

Implemented in:
- Form capacity banner: `ReservationFormModal.svelte`
- Message constants: `app/src/lib/constants/messages.ts`

---

## 7) Security and RLS

- All CREATE/UPDATE/DELETE go through Edge Functions (`reservations-create`, `reservations-update`, `reservations-delete`, `reservations-approve`).
- RLS ensures users cannot write directly to tables.
- READ operations (client capacity checks) are allowed and scoped.

---

## 8) File Map (Where Things Live)

- Client
  - `app/src/lib/components/ReservationFormModal/ReservationFormModal.svelte`
  - `app/src/lib/utils/availabilityClient.ts`
  - `app/src/lib/services/reservationService.ts`
  - `app/src/lib/components/AdminDashboard/AdminDashboard.svelte`
  - `app/src/lib/constants/messages.ts`

- Server (Edge Functions)
  - `supabase/functions/reservations-create/index.ts`
  - `supabase/functions/reservations-approve/index.ts`
  - `supabase/functions/availability-check/index.ts`
  - Shared CORS: `supabase/functions/_shared/cors.ts`

---

## 9) Testing Checklist

- End-user
  - Submit disabled when full (client pre-check)
  - 409 on create when full (server authoritative)
- Admin
  - Approve assigns a free room and confirms
  - Approval fails with standard message when no room is free
- Regression
  - Date-level availability overrides respected
  - Cutoff rules enforced

