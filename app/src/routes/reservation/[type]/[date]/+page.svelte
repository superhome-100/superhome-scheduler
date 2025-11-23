<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore, auth } from '$lib/stores/auth';
  import { supabase } from '$lib/utils/supabase';
  import SingleDayView from '$lib/components/Calendar/SingleDayView.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { ReservationType } from '$lib/types/reservations';

  let loading = true;
  let error: string | null = null;
  let reservations: any[] = [];
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

  const loadReservations = async () => {
    if (!$authStore.user) return;

    try {
      loading = true;
      
      // Load reservations logic (copied from Reservation.svelte)
      const { data, error: fetchError } = await supabase
        .from('reservations')
        .select(`
          *,
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
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)
        `)
        .eq('uid', $authStore.user.id)
        .order('res_date', { ascending: true });

      if (fetchError) throw fetchError;

      reservations = (data || []).map((reservation) => {
        const flattened: any = { ...reservation };
        if (reservation.res_type === 'pool' && reservation.res_pool) {
          flattened.start_time = reservation.res_pool.start_time;
          flattened.end_time = reservation.res_pool.end_time;
          flattened.lane = reservation.res_pool.lane;
          flattened.pool_type = reservation.res_pool.pool_type;
          flattened.student_count = reservation.res_pool.student_count;
          flattened.note = reservation.res_pool.note;
        } else if (reservation.res_type === 'open_water' && reservation.res_openwater) {
          flattened.time_period = reservation.res_openwater.time_period;
          flattened.depth_m = reservation.res_openwater.depth_m;
          flattened.buoy = reservation.res_openwater.buoy;
          flattened.pulley = reservation.res_openwater.pulley;
          flattened.deep_fim_training = reservation.res_openwater.deep_fim_training;
          flattened.bottom_plate = reservation.res_openwater.bottom_plate;
          flattened.large_buoy = reservation.res_openwater.large_buoy;
          flattened.open_water_type = reservation.res_openwater.open_water_type;
          flattened.student_count = reservation.res_openwater.student_count;
          flattened.note = reservation.res_openwater.note;
        } else if (reservation.res_type === 'classroom' && reservation.res_classroom) {
          flattened.start_time = reservation.res_classroom.start_time;
          flattened.end_time = reservation.res_classroom.end_time;
          flattened.room = reservation.res_classroom.room;
          flattened.classroom_type = reservation.res_classroom.classroom_type;
          flattened.student_count = reservation.res_classroom.student_count;
          flattened.note = reservation.res_classroom.note;
        }
        delete flattened.res_pool;
        delete flattened.res_openwater;
        delete flattened.res_classroom;
        return flattened;
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
  />
{/if}
