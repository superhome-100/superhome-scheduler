<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore, auth } from '../../stores/auth';
  import { showSignOutModal, sidebarActions, getUserInfo } from '../../stores/sidebar';
  import { supabase } from '../../utils/supabase';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import PullToRefresh from '../PullToRefresh.svelte';
  import Reservation from '../Reservation/Reservation.svelte';
  import AdminDashboard from '../AdminDashboard/AdminDashboard.svelte';
  import ReservationFormModal from '../ReservationFormModal/ReservationFormModal.svelte';
  import ReservationsListModal from '../ReservationsListModal/ReservationsListModal.svelte';
  import ReservationDetailsModal from '../ReservationDetailsModal/ReservationDetailsModal.svelte';
  // Dashboard sub-components
  import DashboardHeader from './DashboardHeader.svelte';
  import DesktopReservations from './DesktopReservations.svelte';
  import MobileReservations from './MobileReservations.svelte';
  import FloatingActionButton from './FloatingActionButton.svelte';
  import SignOutModal from './SignOutModal.svelte';
  
  // Dashboard utilities
  import { getUpcomingReservations, getCompletedReservations, transformReservationsForModal } from './dashboardUtils';
  import { transformReservationToUnified } from '../../utils/reservationTransform';

  let showReservationDetails = false;
  let selectedReservation: any = null;
  // Use raw reservation rows from Supabase (with joined detail tables)
  // We avoid flattening here; components use unified transform when needed
  let reservations: any[] = [];
  let loading = false;
  let refreshing = false;
  let error: string | null = null;
  
  // Modal state management
  let showReservationsModal = false;
  let modalReservations: any[] = [];
  let modalTitle = 'Reservations';
  let showReservationForm = false;
  // Mobile tabs state
  let activeMobileTab: 'upcoming' | 'completed' = 'upcoming';
  let showMobileViewAll = false;
  let upcomingListEl: HTMLDivElement | null = null;
  let completedListEl: HTMLDivElement | null = null;
  let isAdmin = false;
  let adminChecked = false;

  // Derived user info
  $: ({ userEmail, userName, userAvatarUrl, userInitial } = getUserInfo($authStore));


  // Get current view from URL path
  $: currentView = $page.url.pathname;

  // Recompute if mobile list overflows viewport to show "View All"
  const computeMobileOverflow = () => {
    const el = (activeMobileTab === 'upcoming' ? upcomingListEl : completedListEl) as HTMLDivElement | null;
    // If list element not ready, hide View All
    if (!el) { showMobileViewAll = false; return; }
    // Show when scrollable (list height exceeds container height)
    showMobileViewAll = (el.scrollHeight || 0) > (el.clientHeight || 0) + 2;
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
          res_pool!left(start_time, end_time, lane, pool_type, note),
          res_openwater!left(time_period, depth_m, buoy, pulley, deep_fim_training, bottom_plate, large_buoy, open_water_type, student_count, note),
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)
        `)
        .eq('uid', $authStore.user.id)
        .order('res_date', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      // Store raw rows; downstream code uses unified transform when needed
      reservations = data || [];
      
    } catch (err) {
      console.error('Error loading reservations:', err);
      error = err instanceof Error ? err.message : 'Failed to load reservations';
    } finally {
      loading = false;
    }
  };

  // Event handlers
  const handleRefresh = async () => {
    try {
      refreshing = true;
      await loadReservations();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      refreshing = false;
    }
  };



  const handleNewReservation = () => {
    showReservationForm = true;
  };


  const openUpcomingReservationsModal = () => {
    modalReservations = transformReservationsForModal(upcomingReservations);
    modalTitle = 'Upcoming Reservations';
    showReservationsModal = true;
  };

  const openCompletedReservationsModal = () => {
    modalReservations = transformReservationsForModal(completedReservations);
    modalTitle = 'Completed Reservations';
    showReservationsModal = true;
  };

  const closeReservationsModal = () => {
    showReservationsModal = false;
  };

  const handleReservationCreated = () => {
    showReservationForm = false;
    loadReservations();
  };

  const handleReservationClick = (event: CustomEvent) => {
    const reservation = event.detail;
    
    // Use unified transformation for consistent data structure
    if (reservation) {
      try {
        const transformed = transformReservationToUnified(reservation);
        selectedReservation = transformed;
      } catch (error) {
        console.error('Dashboard: Error transforming reservation:', error);
        selectedReservation = null;
      }
    } else {
      selectedReservation = null;
    }
    showReservationDetails = true;
  };

  const closeReservationDetails = () => {
    showReservationDetails = false;
    selectedReservation = null;
  };


  const handleTabChange = (event: CustomEvent) => {
    activeMobileTab = event.detail;
  };

  const handleViewAll = () => {
    if (activeMobileTab === 'upcoming') {
      modalReservations = transformReservationsForModal(upcomingReservations);
      modalTitle = 'Upcoming Reservations';
    } else {
      modalReservations = transformReservationsForModal(completedReservations);
      modalTitle = 'Completed Reservations';
    }
    showReservationsModal = true;
  };

  const handleSignOutConfirm = async () => {
    sidebarActions.closeSignOutModal();
    await auth.signOut();
  };

  onMount(() => {
    const initializeDashboard = async () => {
      // Ensure light mode only
      document.documentElement.classList.remove('dark-mode');

      // Determine admin role
      try {
        isAdmin = await auth.isAdmin();
      } finally {
        adminChecked = true;
      }

      // Load reservations
      try {
        await loadReservations();
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
      // compute initial overflow for mobile
      setTimeout(computeMobileOverflow, 0);
    };

    // Initialize dashboard asynchronously
    initializeDashboard();
  });

  // Enforce access after admin check
  $: if (adminChecked) {
    const urlPath = $page.url.pathname;
    if (urlPath.includes('/admin') && !isAdmin) {
      goto('/');
    }
  }

  // Recompute on tab change and when reservations change
  $: activeMobileTab, computeMobileOverflow();
  $: reservations, computeMobileOverflow();
  window.addEventListener('resize', computeMobileOverflow);

  // Computed values for sub-components
  $: upcomingReservations = getUpcomingReservations(reservations);
  $: completedReservations = getCompletedReservations(reservations);
</script>

<div class="min-h-screen bg-base-200 dashboard-container">
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
    {#if currentView === '/'}
      <!-- Sticky Header -->
      <DashboardHeader 
        {userName}
      />

      <!-- Pull-to-Refresh Body -->
      <PullToRefresh onRefresh={handleRefresh} {refreshing}>
        <div class="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div class="flex flex-col gap-6">
            <!-- Desktop Reservations -->
            <DesktopReservations 
              {upcomingReservations}
              {completedReservations}
              {loading}
              {error}
              on:reservationClick={handleReservationClick}
              on:viewAllUpcoming={openUpcomingReservationsModal}
              on:viewAllCompleted={openCompletedReservationsModal}
              on:newReservation={handleNewReservation}
              on:retry={loadReservations}
            />

            <!-- Mobile Reservations -->
            <MobileReservations 
              {upcomingReservations}
              {completedReservations}
              {activeMobileTab}
              {showMobileViewAll}
              {loading}
              {error}
              bind:upcomingListEl
              bind:completedListEl
              on:tabChange={handleTabChange}
              on:viewAll={handleViewAll}
              on:reservationClick={handleReservationClick}
              on:newReservation={handleNewReservation}
              on:computeOverflow={computeMobileOverflow}
              on:retry={loadReservations}
            />

          </div>
          
          <!-- Floating Action Button -->
          <FloatingActionButton on:newReservation={handleNewReservation} />
        </div>
      </PullToRefresh>
    {:else if currentView === '/reservation'}
      <Reservation key={currentView} />
    {:else if currentView === '/admin' || currentView === '/admin/calendar' || currentView === '/admin/users'}
      <AdminDashboard />
    {/if}
  {/if}
</div>

<style>
  .dashboard-container {
    /* Sidebar positioning is handled by the main layout's drawer structure */
    margin-left: 0;
  }
</style>

<!-- Reservation Form Modal -->
<ReservationFormModal 
  isOpen={showReservationForm}
  on:submit={handleReservationCreated}
  on:close={() => showReservationForm = false}
/>

<!-- Reservations List Modal -->
<ReservationsListModal 
  isOpen={showReservationsModal}
  reservations={modalReservations}
  title={modalTitle}
  showDetails={true}
  on:close={closeReservationsModal}
  on:reservationClick={handleReservationClick}
/>

<!-- Reservation Details Modal -->
<ReservationDetailsModal 
  isOpen={showReservationDetails}
  reservation={selectedReservation}
  on:close={closeReservationDetails}
/>

<!-- Sign Out Modal -->
<SignOutModal 
  showModal={$showSignOutModal}
  on:confirm={handleSignOutConfirm}
  on:cancel={sidebarActions.closeSignOutModal}
/>

