<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore, auth } from '../../stores/auth';
  import { showSignOutModal, sidebarActions, getUserInfo, mobileDrawerOpen } from '../../stores/sidebar';
  import { supabase } from '../../utils/supabase';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import PullToRefresh from '../PullToRefresh.svelte';
  import Reservation from '../Reservation/Reservation.svelte';
  import Sidebar from '../Sidebar/Sidebar.svelte';
  import AdminDashboard from '../AdminDashboard/AdminDashboard.svelte';
  import ReservationFormModal from '../ReservationFormModal/ReservationFormModal.svelte';
  import ReservationsListModal from '../ReservationsListModal/ReservationsListModal.svelte';
  import ReservationDetailsModal from '../ReservationDetailsModal/ReservationDetailsModal.svelte';
  import SingleDayView from '../Calendar/SingleDayView.svelte';
  
  // Dashboard sub-components
  import DashboardHeader from './DashboardHeader.svelte';
  import DesktopReservations from './DesktopReservations.svelte';
  import MobileReservations from './MobileReservations.svelte';
  import CalendarSection from './CalendarSection.svelte';
  import FloatingActionButton from './FloatingActionButton.svelte';
  import SignOutModal from './SignOutModal.svelte';
  
  // Dashboard utilities
  import { getUpcomingReservations, getCompletedReservations, transformReservationsForModal } from './dashboardUtils';
  import { transformReservationToUnified } from '../../utils/reservationTransform';

  let showUpcomingModal = false;
  let showCompletedModal = false;
  let showReservationDetails = false;
  let selectedReservation: any = null;
  let showSingleDayView = false;
  let selectedDate = '';
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
  let reservationForm: ReservationFormModal;
  let isAdmin = false;
  let adminChecked = false;

  // Derived user info for Sidebar
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

  // Navigate to a new view using SvelteKit
  const navigateToView = (view: string) => {
    if (view === 'dashboard') {
      goto('/');
    } else if (view === 'admin') {
      goto('/admin');
    } else if (view === 'admin-calendar') {
      goto('/admin/calendar');
    } else if (view === 'admin-users') {
      goto('/admin/users');
    } else if (view === 'reservation') {
      goto('/reservation');
    } else {
      goto(`/${view}`);
    }
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
      
      // Store raw rows; downstream code uses unified transform when needed
      reservations = data || [];
      
      console.log('Loaded reservations with details:', reservations);
    } catch (err) {
      console.error('Error loading reservations:', err);
      error = err instanceof Error ? err.message : 'Failed to load reservations';
    } finally {
      loading = false;
    }
  };
  
  
  // Type definitions
  type ReservationStatus = 'pending' | 'confirmed' | 'rejected';
  type ReservationType = 'pool' | 'open_water' | 'classroom';
  
  interface Reservation {
    uid: string;
    res_date: string;
    res_type: ReservationType;
    res_status: ReservationStatus;
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    created_at: string;
    updated_at: string;
  }

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

  const handleSidebarNavigate = (event: CustomEvent) => {
    const view = event.detail.view;
    navigateToView(view);
  };

  const handleSidebarSignOut = () => {
    sidebarActions.openSignOutModal();
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

  const closeReservationForm = () => {
    showReservationForm = false;
  };

  const handleReservationClick = (event: CustomEvent) => {
    const reservation = event.detail;
    console.log('Dashboard: handleReservationClick - Raw reservation:', reservation);
    console.log('Dashboard: handleReservationClick - res_status:', reservation?.res_status);
    console.log('Dashboard: handleReservationClick - res_status type:', typeof reservation?.res_status);
    
    // Use unified transformation for consistent data structure
    if (reservation) {
      try {
        const transformed = transformReservationToUnified(reservation);
        console.log('Dashboard: handleReservationClick - Unified transformed reservation:', transformed);
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

  const handleCalendarEventClick = (event: CustomEvent) => {
    const reservation = event.detail;
    // Calendar provides raw DB reservation; use unified transformation
    try {
      const transformed = transformReservationToUnified(reservation);
      selectedReservation = transformed;
      showReservationDetails = true;
    } catch (error) {
      console.error('Dashboard: Error transforming calendar reservation:', error);
      selectedReservation = null;
    }
  };

  const handleCalendarDateClick = (event: CustomEvent) => {
    console.log('Dashboard: handleCalendarDateClick - event.detail:', event.detail);
    selectedDate = event.detail;
    showSingleDayView = true;
  };

  const handleBackToCalendar = () => {
    showSingleDayView = false;
    selectedDate = '';
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

<div class="dashboard-container">
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
    <div class="drawer lg:drawer-open dashboard-layout">
      <!-- Sidebar (fixed on desktop) -->
      <Sidebar 
        {isAdmin}
        userName={userName}
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
        userInitial={userInitial}
        on:signOut={handleSidebarSignOut}
      />

      <!-- Main Content -->
      <main class="drawer-content main-content">
        {#if showSingleDayView}
          <SingleDayView
            {selectedDate}
            {reservations}
            isAdmin={false}
            on:backToCalendar={handleBackToCalendar}
            on:reservationClick={handleReservationClick}
          />
        {:else if currentView === '/'}
          <DashboardHeader 
            {userName}
          />

          <!-- Pull-to-Refresh Body -->
          <PullToRefresh onRefresh={handleRefresh} {refreshing}>
            <div class="dashboard-content">
              <div class="content-body">
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

                <!-- Calendar Section -->
                <div class="calendar-section-wrapper">
                  <CalendarSection 
                    {reservations}
                    on:eventClick={handleCalendarEventClick}
                    on:dateClick={handleCalendarDateClick}
                  />
                </div>
              </div>
              
              <!-- Floating Action Button -->
              <FloatingActionButton on:newReservation={handleNewReservation} />

            </div>
          </PullToRefresh>
        {:else if currentView === '/reservation'}
          <Reservation />
        {:else if currentView === '/admin' || currentView === '/admin/calendar' || currentView === '/admin/users'}
          <AdminDashboard />
        {/if}

      </main>
    </div>
  {/if}
</div>

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


<style>
  .dashboard-container {
    height: 100vh;
    background: #f8fafc;
    overflow: hidden; /* prevent body + inner double scroll */
  }

  .dashboard-layout {
    display: flex;
    height: 100vh;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0; /* allow child scroll container to size */
    overflow: hidden; /* only inner PullToRefresh scrolls */
    margin-left: 0; /* No margin on mobile */
  }

  /* Desktop: Add left margin to account for fixed sidebar (w-80 = 20rem) */
  @media (min-width: 1024px) {
    .main-content {
      margin-left: 20rem; /* 320px - matches sidebar width */
    }
  }

  /* Ensure the PullToRefresh becomes the single scroll container */
  .main-content > :global(.pull-to-refresh-container) {
    flex: 1;
    min-height: 0;
  }

  .dashboard-content {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .content-body {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
  }

  .error-state h2 {
    color: #dc2626;
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }

  .error-state p {
    color: #64748b;
    margin: 0 0 2rem 0;
  }

  .error-state button {
    background: #3b82f6;
    color: hsl(var(--bc));
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
  }


  /* Calendar wrapper for mobile hiding */
  .calendar-section-wrapper {
    display: block;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .dashboard-content {
      padding: 1rem;
    }

    .content-body {
      gap: 1rem;
    }

    /* Hide calendar on mobile */
    .calendar-section-wrapper {
      display: none;
    }
  }
</style>