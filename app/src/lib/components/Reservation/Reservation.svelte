<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/auth';
  import { supabase } from '../../utils/supabase';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import PullToRefresh from '../PullToRefresh.svelte';
  import ReservationFormModal from '../ReservationFormModal/ReservationFormModal.svelte';
  import ReservationDetailsModal from '../ReservationDetailsModal/ReservationDetailsModal.svelte';
  import ReservationHeader from './ReservationHeader.svelte';
  import ReservationTypeButtons from './ReservationTypeButtons.svelte';
  import ReservationCalendar from './ReservationCalendar.svelte';
  import FloatingActionButton from './FloatingActionButton.svelte';
  import SingleDayView from '../Calendar/SingleDayView.svelte';
  import { transformReservationForModal } from './reservationUtils';
  import { transformReservationToUnified } from '../../utils/reservationTransform';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';
  let showReservationModal = false;
  let showDetailsModal = false;
  let refreshing = false;
  let selectedReservation: any = null;
  
  // Single day view state
  let showSingleDayView = false;
  let selectedDate: string = '';
  let initialSingleDayType: 'pool' | 'openwater' | 'classroom' = 'pool';
  
  // Database data
  let reservations: any[] = [];
  let loading = false;
  let error: string | null = null;

  const toggleMobileSidebar = () => {
    dispatch('toggleMobileSidebar');
  };

  const handleNewReservation = () => {
    showReservationModal = true;
  };

  const handleReservationSubmit = (event: CustomEvent) => {
    const reservationData = event.detail;
    console.log('New reservation submitted:', reservationData);
    // Close modal and refresh data
    showReservationModal = false;
    loadReservations();
  };

  const handleTypeSelected = (event: CustomEvent) => {
    selectedType = event.detail.type;
  };

  const handleReservationClick = (event: CustomEvent) => {
    const reservation = event.detail;
    console.log('Raw reservation data:', reservation);
    
    try {
      selectedReservation = transformReservationToUnified(reservation);
      console.log('Unified transformed reservation data:', selectedReservation);
    } catch (error) {
      console.error('Error transforming reservation:', error);
      selectedReservation = null;
    }
    showDetailsModal = true;
  };

  // Handle calendar date click
  const handleCalendarDateClick = (event: CustomEvent) => {
    const detail: any = event.detail;
    selectedDate = typeof detail === 'string' ? detail : detail?.date;
    initialSingleDayType = typeof detail === 'string' ? selectedType : (detail?.type || selectedType);
    showSingleDayView = true;
  };

  // Handle back to calendar
  const handleBackToCalendar = () => {
    showSingleDayView = false;
    selectedDate = '';
  };

  // Load user's reservations from Supabase with detail tables
  const loadReservations = async () => {
    if (!$authStore.user) return;
    
    try {
      loading = true;
      error = null;
      
      // Load reservations with all detail tables joined
      const { data, error: fetchError } = await supabase
        .from('reservations')
        .select(`
          *,
          res_pool!left(start_time, end_time, lane, note),
          res_openwater!left(time_period, depth_m, buoy, pulley, deep_fim_training, bottom_plate, large_buoy, open_water_type, student_count, note),
          res_classroom!left(start_time, end_time, room, note)
        `)
        .eq('uid', $authStore.user.id)
        .order('res_date', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      // Flatten the joined data for easier access
      reservations = (data || []).map(reservation => {
        const flattened = { ...reservation };
        
        // Flatten detail table data based on reservation type
        if (reservation.res_type === 'pool' && reservation.res_pool) {
          flattened.start_time = reservation.res_pool.start_time;
          flattened.end_time = reservation.res_pool.end_time;
          flattened.lane = reservation.res_pool.lane;
          flattened.note = reservation.res_pool.note;
          // Use the status from the detail table if available
          if (reservation.res_pool.res_status) {
            flattened.res_status = reservation.res_pool.res_status;
          }
        } else if (reservation.res_type === 'open_water' && reservation.res_openwater) {
          flattened.time_period = reservation.res_openwater.time_period;
          flattened.depth_m = reservation.res_openwater.depth_m;
          flattened.buoy = reservation.res_openwater.buoy;
          // auto_adjust_closest field removed
          flattened.pulley = reservation.res_openwater.pulley;
          flattened.deep_fim_training = reservation.res_openwater.deep_fim_training;
          flattened.bottom_plate = reservation.res_openwater.bottom_plate;
          flattened.large_buoy = reservation.res_openwater.large_buoy;
          flattened.open_water_type = reservation.res_openwater.open_water_type;
          flattened.student_count = reservation.res_openwater.student_count;
          flattened.note = reservation.res_openwater.note;
          // Use the status from the detail table if available
          if (reservation.res_openwater.res_status) {
            flattened.res_status = reservation.res_openwater.res_status;
          }
        } else if (reservation.res_type === 'classroom' && reservation.res_classroom) {
          flattened.start_time = reservation.res_classroom.start_time;
          flattened.end_time = reservation.res_classroom.end_time;
          flattened.room = reservation.res_classroom.room;
          flattened.note = reservation.res_classroom.note;
          // Use the status from the detail table if available
          if (reservation.res_classroom.res_status) {
            flattened.res_status = reservation.res_classroom.res_status;
          }
        }
        
        // Remove the joined table objects to avoid confusion
        delete flattened.res_pool;
        delete flattened.res_openwater;
        delete flattened.res_classroom;
        
        return flattened;
      });
      
      console.log('Loaded reservations with details:', reservations);
    } catch (err) {
      console.error('Error loading reservations:', err);
      error = err instanceof Error ? err.message : 'Failed to load reservations';
    } finally {
      loading = false;
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    try {
      refreshing = true;
      await loadReservations();
    } catch (error) {
      console.error('Reservation refresh error:', error);
    } finally {
      refreshing = false;
    }
  };

  const handleReservationModalClose = () => {
    showReservationModal = false;
  };


  const handleDetailsModalClose = () => {
    showDetailsModal = false;
    selectedReservation = null;
  };


  onMount(() => {
    // Ensure light mode only
    document.documentElement.classList.remove('dark-mode');
    
    // Load reservations
    loadReservations();
  });
</script>

<div class="reservation-container">
  {#if $authStore.loading}
  <LoadingSpinner 
    size="lg" 
    text="Loading..." 
    variant="overlay"
    zIndex={50}
  />
{:else if $authStore.error}
  <div class="error-state">
    <h2>Something went wrong</h2>
    <p>{$authStore.error}</p>
    <button on:click={() => window.location.reload()}>Try Again</button>
  </div>
{:else if $authStore.user}
  <div class="reservation-layout">
    <!-- Sticky Header -->
    <ReservationHeader on:toggleMobileSidebar={toggleMobileSidebar} />

    <!-- Pull-to-Refresh Body -->
    <PullToRefresh onRefresh={handleRefresh} {refreshing}>
      <main class="main-content">

        <div class="content-body">
          {#if loading}
            <div class="loading-state">
              <LoadingSpinner size="md" />
              <p>Loading reservations...</p>
            </div>
          {:else if error}
            <div class="error-state">
              <p>Error: {error}</p>
              <button on:click={loadReservations}>Retry</button>
            </div>
          {:else}
            {#if showSingleDayView}
              <SingleDayView
                {selectedDate}
                {reservations}
                isAdmin={false}
      initialType={initialSingleDayType}
                on:backToCalendar={handleBackToCalendar}
                on:reservationClick={handleReservationClick}
              />
            {:else}
              <!-- Reservation Type Buttons -->
              <ReservationTypeButtons 
                bind:selectedType 
                on:typeSelected={handleTypeSelected}
              />

              <!-- Calendar Section -->
              <ReservationCalendar 
                {selectedType} 
                {reservations}
                on:reservationClick={handleReservationClick}
                on:dateClick={handleCalendarDateClick}
              />
            {/if}
          {/if}
        </div>

        <!-- Floating Action Button: New Reservation -->
        {#if !showSingleDayView}
          <FloatingActionButton on:newReservation={handleNewReservation} />
        {/if}
      </main>
    </PullToRefresh>
  </div>
  {/if}
</div>

<!-- Reservation Form Modal -->
<ReservationFormModal 
  isOpen={showReservationModal}
  on:close={handleReservationModalClose}
  on:submit={handleReservationSubmit}
/>

<!-- Reservation Details Modal -->
<ReservationDetailsModal 
  isOpen={showDetailsModal}
  reservation={selectedReservation}
  on:close={handleDetailsModalClose}
/>

<style>
  .reservation-container {
    height: 100vh;
    background: #f8fafc;
    overflow: hidden; /* prevent double scroll; PullToRefresh scrolls */
  }

  .reservation-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: #f8fafc;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
    min-height: 0;
    overflow: hidden; /* only child PullToRefresh scrolls */
  }

  /* Ensure PullToRefresh becomes the single scroll container */
  .reservation-layout > :global(.pull-to-refresh-container) {
    flex: 1;
    min-height: 0;
  }


  .content-body {
    flex: 1;
    padding: 2rem;
  }


  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    color: #e53e3e;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    color: #64748b;
    gap: 1rem;
  }

  .loading-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .content-body {
      padding: 1rem;
    }
  }
</style>
