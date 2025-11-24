<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, auth } from '../../stores/auth';
  import { supabase } from '../../utils/supabase';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import PullToRefresh from '../PullToRefresh.svelte';
  import ReservationFormModal from '../ReservationFormModal/ReservationFormModal.svelte';
  import ReservationDetailsModal from '../ReservationDetailsModal/ReservationDetailsModal.svelte';
  import ReservationHeader from './ReservationHeader.svelte';
  import ReservationTypeButtons from './ReservationTypeButtons.svelte';
  import ReservationCalendar from './ReservationCalendar.svelte';
  import FloatingActionButton from './FloatingActionButton.svelte';
  import { transformReservationForModal } from './reservationUtils';
  import { transformReservationToUnified } from '../../utils/reservationTransform';
  import { createEventDispatcher } from 'svelte';
  import { ReservationType } from '../../types/reservations';
  import ErrorModal from '../ErrorModal.svelte';

  const dispatch = createEventDispatcher();

  export let initialType: ReservationType = ReservationType.openwater;
  let selectedType: ReservationType = initialType;
  // Map selectedType to form modal initialType literal
  $: initialTypeForModal = (() => {
    switch (selectedType) {
      case ReservationType.pool:
        return 'pool';
      case ReservationType.classroom:
        return 'classroom';
      case ReservationType.openwater:
      default:
        return 'openwater';
    }
  })();
  
  $: if (initialType) {
    selectedType = initialType;
  }

  let showReservationModal = false;
  let showDetailsModal = false;
  let refreshing = false;
  let selectedReservation: any = null;
  // Modal state
  let statusModalOpen = false;
  let statusModalTitle = 'Account Notice';
  let statusModalMessage = '';

  // Database data
  let reservations: any[] = [];
  let loading = false;
  let error: string | null = null;

  // Debug: Track selectedType changes
  // $: console.log('Reservation: selectedType changed to:', selectedType);


  const handleNewReservation = async () => {
    try {
      if (!$authStore.user) return;
      const uid = $authStore.user.id;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('uid', uid)
        .single();
      if (error) {
        console.error('Failed to fetch user status:', error);
        statusModalTitle = 'Account Status';
        statusModalMessage = 'Unable to verify account status. Please try again later.';
        statusModalOpen = true;
        return;
      }
      if (data && String((data as any).status).toLowerCase() === 'disabled') {
        statusModalTitle = 'Account Disabled';
        statusModalMessage = 'Your account is disabled at the moment. Please contact the admin for assistance.';
        statusModalOpen = true;
        return;
      }
      showReservationModal = true;
    } catch (e) {
      console.error('Status check error:', e);
      statusModalTitle = 'Account Status';
      statusModalMessage = 'Unable to verify account status. Please try again later.';
      statusModalOpen = true;
    }
  };

  const handleReservationSubmit = (event: CustomEvent) => {
    const reservationData = event.detail;
    console.log('New reservation submitted:', reservationData);
    // Close modal and refresh data
    showReservationModal = false;
    loadReservations();
  };

  const handleTypeSelected = (event: CustomEvent<{ type: ReservationType }>) => {
    console.log('Reservation: Type selected:', event.detail.type);
    selectedType = event.detail.type;
    console.log('Reservation: selectedType updated to:', selectedType);
    console.log('Reservation: About to pass selectedType to ReservationCalendar:', selectedType);
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
    const dateStr = typeof detail === 'string' ? detail : detail?.date;
    const typeToUse = typeof detail === 'string' ? selectedType : (detail?.type || selectedType);
    
    console.log('Reservation: Date clicked - navigating to:', `/reservation/${typeToUse}/${dateStr}`);
    goto(`/reservation/${typeToUse}/${dateStr}`);
  };



  // Stats for calendar view
  let calendarStats: any[] = [];

  // Load user's reservations from Supabase with detail tables
  const loadReservations = async () => {
    if (!$authStore.user) {
      console.log('loadReservations: No user, skipping');
      return;
    }
    
    console.log('loadReservations: Starting to load reservations for user:', $authStore.user.id);
    
    try {
      loading = true;
      error = null;
      
      // Load reservations with all detail tables joined
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
      
      if (fetchError) {
        console.error('loadReservations: Supabase error:', fetchError);
        throw fetchError;
      }
      
      console.log('loadReservations: Raw data from Supabase:', data);
      
      // Flatten the joined data for easier access
      reservations = (data || []).map((reservation) => {
        const flattened: any = { ...reservation };
        
        // Flatten detail table data based on reservation type
        if (reservation.res_type === 'pool' && reservation.res_pool) {
          flattened.start_time = reservation.res_pool.start_time;
          flattened.end_time = reservation.res_pool.end_time;
          flattened.lane = reservation.res_pool.lane;
          flattened.pool_type = reservation.res_pool.pool_type;
          // Ensure student_count is available for UI labels (e.g., "You + N of students")
          flattened.student_count = reservation.res_pool.student_count;
          flattened.note = reservation.res_pool.note;
          // Note: Use main reservation status, not detail table status
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
          // Note: Use main reservation status, not detail table status
          // Note: buoy_group data will be loaded separately if needed
        } else if (reservation.res_type === 'classroom' && reservation.res_classroom) {
          flattened.start_time = reservation.res_classroom.start_time;
          flattened.end_time = reservation.res_classroom.end_time;
          flattened.room = reservation.res_classroom.room;
          flattened.classroom_type = reservation.res_classroom.classroom_type;
          flattened.student_count = reservation.res_classroom.student_count;
          flattened.note = reservation.res_classroom.note;
        }
        
        // Remove the joined table objects to avoid confusion
        delete flattened.res_pool;
        delete flattened.res_openwater;
        delete flattened.res_classroom;
        
        return flattened;
      });
      
      console.log('Loaded reservations with details:', reservations);
      console.log('Number of reservations loaded:', reservations.length);

      // Fetch global stats for calendar view
      // Get range: start of current month - 1 month to end of current month + 2 months (approx)
      // For simplicity, just fetch +/- 3 months from now
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString();

      const { data: statsData, error: statsError } = await supabase
        .rpc('get_monthly_reservation_stats', {
          start_date: start,
          end_date: end
        });

      if (statsError) {
        console.error('Error fetching calendar stats:', statsError);
      } else {
        console.log('Loaded calendar stats:', statsData);
        calendarStats = statsData || [];
      }

    } catch (err) {
      console.error('Error loading reservations:', err);
      error = err instanceof Error ? err.message : 'Failed to load reservations';
    } finally {
      console.log('loadReservations: Setting loading to false');
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


  let isAdmin = false;

  onMount(async () => {
    console.log('Reservation: onMount called');
    // Ensure light mode only
    document.documentElement.classList.remove('dark-mode');
    
    // Check admin status
    isAdmin = await auth.isAdmin();
    console.log('Reservation: User is admin?', isAdmin);
    
    // Load reservations
    loadReservations();
  });
</script>

<div class="min-h-screen bg-base-200">
  {#if $authStore.loading}
  <LoadingSpinner 
    size="lg" 
    text="Loading..." 
    variant="overlay"
    zIndex={50}
  />
{:else if $authStore.error}
  <div class="flex flex-col items-center justify-center min-h-screen text-center">
    <h2 class="text-2xl font-bold text-error mb-4">Something went wrong</h2>
    <p class="text-base-content/70 mb-6">{$authStore.error}</p>
    <button class="btn btn-primary" on:click={() => window.location.reload()}>Try Again</button>
  </div>
{:else if $authStore.user}
  <!-- Sticky Header -->
  <ReservationHeader />

  <!-- Pull-to-Refresh Body -->
  <PullToRefresh onRefresh={handleRefresh} {refreshing}>
    <div class="flex-1 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 xl:px-10 xl:py-6 2xl:px-12 2xl:py-6 max-w-7xl mx-auto w-full">
      {#if loading}
        <div class="flex flex-col items-center justify-center min-h-96 text-center">
          <LoadingSpinner size="md" />
          <p class="mt-4 text-base-content/70">Loading reservations...</p>
        </div>
      {:else if error}
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 class="font-bold">Error loading reservations</h3>
            <div class="text-xs">{error}</div>
          </div>
          <button class="btn btn-sm btn-outline" on:click={loadReservations}>Retry</button>
        </div>
      {:else}
          <!-- Calendar Content Card -->
          <div class="card bg-base-100 shadow-lg border border-base-300">
            <div class="card-body p-6">
              <!-- Reservation Type Buttons -->
              <ReservationTypeButtons 
                {selectedType}
                on:typeSelected={handleTypeSelected}
              />

              <!-- Calendar Section -->
              <ReservationCalendar 
                {selectedType}
                {reservations}
                {loading}
                stats={calendarStats}
                on:reservationClick={handleReservationClick}
                on:dateClick={handleCalendarDateClick}
              />
            </div>
          </div>
      {/if}
    </div>

    <!-- Floating Action Button: New Reservation -->
    <FloatingActionButton on:newReservation={handleNewReservation} />
  </PullToRefresh>
  {/if}
</div>

<!-- Reservation Form Modal -->
<ReservationFormModal 
  isOpen={showReservationModal}
  initialType={initialTypeForModal}
  on:close={handleReservationModalClose}
  on:submit={handleReservationSubmit}
/>

<!-- Reservation Details Modal -->
<ReservationDetailsModal 
  isOpen={showDetailsModal}
  reservation={selectedReservation}
  on:close={handleDetailsModalClose}
/>

<!-- Centered Modal for Account Status -->
<ErrorModal 
  bind:open={statusModalOpen}
  title={statusModalTitle}
  message={statusModalMessage}
  confirmText="Close"
  on:close={() => (statusModalOpen = false)}
/>
