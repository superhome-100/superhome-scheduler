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
  import { transformReservationForModal } from './reservationUtils';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';
  let showReservationModal = false;
  let showDetailsModal = false;
  let refreshing = false;
  let selectedReservation: any = null;
  
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
    
    selectedReservation = transformReservationForModal(reservation);
    console.log('Transformed reservation data:', selectedReservation);
    showDetailsModal = true;
  };

  // Load user's reservations from Supabase
  const loadReservations = async () => {
    if (!$authStore.user) return;
    
    try {
      loading = true;
      error = null;
      
      const { data, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('uid', $authStore.user.id)
        .order('res_date', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      reservations = data || [];
      
      // Calendar will re-initialize automatically via reactive statements
      
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
            />
          {/if}
        </div>

        <!-- Floating Action Button: New Reservation -->
        <FloatingActionButton on:newReservation={handleNewReservation} />
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
    min-height: 100vh;
    background: #f8fafc;
  }

  .reservation-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #f8fafc;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
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
