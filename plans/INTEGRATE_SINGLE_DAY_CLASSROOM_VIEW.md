# Single-Day Classroom View Integration

This document explains how the old app renders the Single Day Classroom table and how we applied the same principles to the new view. It also lists validation steps and next improvements.

## How the old_app renders the Single Day Classroom view

- __Entry point__: `old_app/src/routes/single-day/classroom/[day]/+page.svelte`
  - Uses `DayHourly.svelte` to render the grid and overlay cards.
  - Listens to date updates and refresh triggers.

- __Time slots__: `old_app/src/lib/reservationTimes.ts`
  - `getStartEndTimes(Settings, dateStr, category)` produces the timeline from Settings with an increment (usually 30 minutes).
  - `startTimes()` and `endTimes()` slice that array for start/end indices.

- __Scheduling__: `old_app/src/lib/utils.ts#getDaySchedule()`
  - Filters reservations, then delegates to `assignHourlySpaces(...)` in `old_app/src/lib/autoAssign/assignHourlySpacesWithBreaks.ts`.
  - Converts reservations to “blocks” with `rsvsToBlock(...)` in `hourlyUtils.ts` (classroom width is always 1).
  - Assigns each block to a room and time range minimizing breaks; pre-assigned rooms stay pinned.
  - Builds display data with `blocksToDisplayData(...)` to produce per-room sequences of either `filler` or `rsv` blocks.

- __Rendering__: `old_app/src/lib/components/DayHourly.svelte`
  - Left column shows time labels derived from slots-per-hour (`slotDiv`).
  - Each room column renders an ordered list of blocks.
  - For reservations: height = `rowHeight * (blk.nSlots / slotDiv) - blkMgn` so visual height matches duration. Filler blocks create vertical gaps.
  - The stacking of filler + rsv blocks in order implicitly positions cards at the correct vertical offsets.

## What we applied to the new view

File: `app/src/lib/components/Calendar/admin/ClassroomCalendar/ClassroomCalendar.svelte`

- __Hour-based rows with sub-hour positioning__
  - Derived `hourSlots` from `timeSlots` and set `grid-template-rows: auto repeat(N, 60px)`.
  - Within each hour cell, we place reservation cards absolutely using percentage-based `top` and `height` computed from minutes.
  - A 30-minute divider line at 50% visually marks `:30` inside each hour row.
  - Example: 09:30–10:00 renders from the middle of the 09:00 row to its bottom.

- __Robust time parsing and indexing__
  - Times are parsed to minutes (`toMin`) rather than matching strings exactly. Works with `HH:mm`, `HH:mm:ss`, or ISO.

- __Provisional room assignment for display__
  - If a reservation lacks a room, we assign a temporary `__display_room` (first free room in its time range) to ensure it renders immediately, similar to old_app behavior.

- __Stable keys__
  - Uses a composite key fallback to avoid card mounting issues on updates.

- __Mobile-first UI with Tailwind/DaisyUI__
  - Compact design for mobile with responsive heights.

## Validation checklist

- __Time slots__: Ensure `timeSlots` are at least 30-minute increments for the selected day.
- __Cases to test__:
  - 09:00–09:30 → top half of 09:00 row.
  - 09:30–10:00 → middle to bottom of 09:00 row.
  - 09:15–10:15 → 09:00 row 25% height, full 10:00 row, 11:00 row 25% (if spanning further).
  - With and without explicit `room`.

## Future improvements

- __Dynamic rooms__: replace the hard-coded `ROOMS = ['1','2','3']` with a settings-driven list (e.g., from Supabase types/settings), keeping code under 300 lines per file.
- __Status indicators__: match old badge semantics (pending vs confirmed) if needed.
- __Click handlers__: connect cards to the Reservation Details modal (SSR-safe with SvelteKit + Supabase SSR utilities already present).
- __Types__: keep strict typing and reuse models/stores; regenerate types on migrations.
- __RLS & refresh__: preserve strict Row Level Security and pull-down refresh (no realtime).

## References (old_app)

- `old_app/src/lib/components/DayHourly.svelte`
- `old_app/src/lib/autoAssign/assignHourlySpacesWithBreaks.ts`
- `old_app/src/lib/autoAssign/hourlyDisplay.ts`
- `old_app/src/lib/autoAssign/hourlyUtils.ts`
- `old_app/src/lib/reservationTimes.ts`
- `old_app/src/lib/utils.ts#getDaySchedule`
