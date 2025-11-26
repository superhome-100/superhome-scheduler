<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import dayjs from 'dayjs';
  import { authStore, auth } from '$lib/stores/auth';
  import { supabase } from '$lib/utils/supabase';
  import SingleDayView from '$lib/components/Calendar/SingleDayView.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { ReservationType } from '$lib/types/reservations';
  import type { CompleteReservation } from '$lib/services/reservationService';
  import type {
    BaseReservationView,
    PoolReservationView,
    OpenWaterReservationView,
    ClassroomReservationView,
    FlattenedReservation,
  } from '$lib/types/reservationViews';

  let loading = true;
  let error: string | null = null;

  let reservations: FlattenedReservation[] = [];
  let isAdmin = false;

  $: type = $page.params.type as ReservationType;
  $: date = $page.params.date;

  const handleBackToCalendar = () => {
    goto(`/reservation/${type}`);
  };

  const handleReservationClick = (event: CustomEvent) => {
    // For now, just log. We might need to implement the modal here too if needed.
    // But SingleDayView usually handles its own modals for Admin Open Water.
    // For User view, it emits reservationClick.
    console.log('Reservation clicked:', event.detail);
  };

  const handleRefreshReservations = async () => {
    await loadReservations();
  };

  const loadReservations = async () => {
    if (!$authStore.user) return;

    try {
      loading = true;
      
      // Load only reservations for the selected date and type
      const startOfDay = dayjs(date).startOf('day');
      const endOfDay = startOfDay.add(1, 'day');

      // Limit nested selects to the current reservation type for efficiency
      let selectColumns = `*,
          res_pool!left(start_time, end_time, lane, pool_type, student_count, note),
          res_openwater!left(
            time_period, 
            depth_m, 
            buoy, 
            pulley, 
            deep_fim_training, 
            bottom_plate, 
            large_buoy, 
            open_water_type, 
            student_count, 
            note,
            group_id
          ),
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)`;

      if (type === ReservationType.pool) {
        selectColumns = `*,
          res_pool!left(start_time, end_time, lane, pool_type, student_count, note)`;
      } else if (type === ReservationType.openwater) {
        selectColumns = `*,
          res_openwater!left(
            time_period, 
            depth_m, 
            buoy, 
            pulley, 
            deep_fim_training, 
            bottom_plate, 
            large_buoy, 
            open_water_type, 
            student_count, 
            note,
            group_id
          )`;
      } else if (type === ReservationType.classroom) {
        selectColumns = `*,
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)`;
      }

      let query = supabase
        .from('reservations')
        .select(selectColumns)
        .gte('res_date', startOfDay.toISOString())
        .lt('res_date', endOfDay.toISOString());

      // For non-admin users, restrict to their own reservations.
      // Admins see all reservations for the selected date and type (RLS still applies server-side).
      if (!isAdmin) {
        query = query.eq('uid', $authStore.user.id);
      }

      // Limit to reservations matching the current view type
      if (type === ReservationType.pool) {
        query = query.eq('res_type', 'pool');
      } else if (type === ReservationType.openwater) {
        query = query.eq('res_type', 'open_water');
      } else if (type === ReservationType.classroom) {
        query = query.eq('res_type', 'classroom');
      }

      const { data, error: fetchError } = await query.order('res_date', {
        ascending: true,
      });

      if (fetchError) throw fetchError;

      reservations = (data || []).map((reservation): FlattenedReservation => {
        const base = reservation as CompleteReservation;

        const common: BaseReservationView = {
          uid: base.uid,
          res_date: base.res_date,
          res_type: base.res_type,
          res_status: base.res_status,
          title: (base as any).title ?? null,
          description: (base as any).description ?? null,
        };

        if (base.res_type === 'pool' && base.res_pool) {
          const view: PoolReservationView = {
            ...common,
            res_type: 'pool',
            start_time: base.res_pool.start_time,
            end_time: base.res_pool.end_time,
            lane: base.res_pool.lane ?? null,
            pool_type: base.res_pool.pool_type ?? null,
            student_count: base.res_pool.student_count ?? null,
            note: base.res_pool.note ?? null,
          };
          return view;
        }

        if (base.res_type === 'open_water' && base.res_openwater) {
          const view: OpenWaterReservationView = {
            ...common,
            res_type: 'open_water',
            group_id: base.res_openwater.group_id ?? null,
            time_period: base.res_openwater.time_period,
            depth_m: base.res_openwater.depth_m ?? null,
            buoy: base.res_openwater.buoy ?? null,
            pulley: base.res_openwater.pulley ?? null,
            deep_fim_training: base.res_openwater.deep_fim_training ?? null,
            bottom_plate: base.res_openwater.bottom_plate ?? null,
            large_buoy: base.res_openwater.large_buoy ?? null,
            open_water_type: base.res_openwater.open_water_type ?? null,
            student_count: base.res_openwater.student_count ?? null,
            note: base.res_openwater.note ?? null,
          };
          return view;
        }

        if (base.res_type === 'classroom' && base.res_classroom) {
          const view: ClassroomReservationView = {
            ...common,
            res_type: 'classroom',
            start_time: base.res_classroom.start_time,
            end_time: base.res_classroom.end_time,
            room: base.res_classroom.room ?? null,
            classroom_type: base.res_classroom.classroom_type ?? null,
            student_count: base.res_classroom.student_count ?? null,
            note: base.res_classroom.note ?? null,
          };
          return view;
        }

        // Fallback: return base fields only if detail tables are missing
        return common as BaseReservationView;
      });

    } catch (err) {
      console.error('Error loading reservations:', err);
      error = err instanceof Error ? err.message : 'Failed to load reservations';
    } finally {
      loading = false;
    }
  };

  onMount(async () => {
    isAdmin = await auth.isAdmin();
    await loadReservations();
  });
</script>

{#if loading}
  <LoadingSpinner size="lg" text="Loading..." variant="overlay" />
{:else if error}
  <div class="alert alert-error m-4">
    <span>{error}</span>
  </div>
{:else}
  <SingleDayView
    selectedDate={date}
    {reservations}
    {isAdmin}
    initialType={type}
    on:backToCalendar={handleBackToCalendar}
    on:reservationClick={handleReservationClick}
    on:refreshReservations={handleRefreshReservations}
  />
{/if}
