<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, auth } from '../../stores/auth';
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

  let showSignOutModal = false;
  let mobileSidebarOpen = false;
  let showUpcomingModal = false;
  let showCompletedModal = false;
  let showReservationDetails = false;
  let selectedReservation: any = null;
  let currentView = 'dashboard'; // 'dashboard', 'reservation', or 'admin'
  let showSingleDayView = false;
  let selectedDate = '';
  let reservations: Reservation[] = [];
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
  $: userEmail = $authStore.user?.email || 'user@example.com';
  $: userName = ($authStore.user?.user_metadata?.full_name || $authStore.user?.user_metadata?.name || userEmail.split('@')[0] || 'User');
  $: userAvatarUrl = ($authStore.user?.user_metadata?.avatar_url || $authStore.user?.user_metadata?.picture) ?? null;
  $: userInitial = (userName?.charAt(0) || userEmail?.charAt(0) || 'U').toUpperCase();

  // Initialize current view from URL or localStorage
  const initializeCurrentView = () => {
    const urlPath = window.location.pathname;

    // Priority 1: URL-based routing with role enforcement
    if (urlPath.includes('/admin')) {
      // Check for specific admin sub-views
      if (urlPath.includes('/admin/calendar')) {
        currentView = 'admin-calendar';
      } else if (urlPath.includes('/admin/users')) {
        currentView = 'admin-users';
      } else {
        currentView = 'admin';
      }
      return;
    } else if (urlPath.includes('/reservation')) {
      currentView = 'reservation';
    } else if (urlPath === '/') {
      // Default: root shows regular dashboard for everyone (admins can manually go to /admin)
      currentView = 'dashboard';
      if (window.location.pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
    } else {
      // Fallback to dashboard for any other routes
      currentView = 'dashboard';
    }

    // Persist chosen view and normalize URL
    localStorage.setItem('currentView', currentView);
    const expectedUrl = currentView === 'dashboard' ? '/' : `/${currentView}`;
    if (window.location.pathname !== expectedUrl) {
      window.history.replaceState({}, '', expectedUrl);
    }
  };

  // Recompute if mobile list overflows viewport to show "View All"
  const computeMobileOverflow = () => {
    const el = (activeMobileTab === 'upcoming' ? upcomingListEl : completedListEl) as HTMLDivElement | null;
    // If list element not ready, hide View All
    if (!el) { showMobileViewAll = false; return; }
    // Show when scrollable (list height exceeds container height)
    showMobileViewAll = (el.scrollHeight || 0) > (el.clientHeight || 0) + 2;
  };

  // Save current view to localStorage and update URL
  const updateCurrentView = (newView: string) => {
    currentView = newView;
    localStorage.setItem('currentView', newView);
    
    // Update URL without page reload
    let newUrl = '/';
    if (newView === 'dashboard') {
      newUrl = '/';
    } else if (newView === 'admin') {
      newUrl = '/admin';
    } else if (newView === 'admin-calendar') {
      newUrl = '/admin/calendar';
    } else if (newView === 'admin-users') {
      newUrl = '/admin/users';
    } else {
      newUrl = `/${newView}`;
    }
    window.history.pushState({}, '', newUrl);
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
        
        console.log('Flattened reservation:', {
          res_type: flattened.res_type,
          res_status: flattened.res_status,
          original_status: reservation.res_status,
          deep_fim_training: flattened.deep_fim_training,
          pulley: flattened.pulley,
          bottom_plate: flattened.bottom_plate,
          large_buoy: flattened.large_buoy
        });
        
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

  const toggleMobileSidebar = () => {
    mobileSidebarOpen = !mobileSidebarOpen;
  };

  const handleSidebarNavigate = (event: CustomEvent) => {
    const view = event.detail.view;
    updateCurrentView(view);
    mobileSidebarOpen = false;
  };

  const handleSidebarClose = () => {
    mobileSidebarOpen = false;
  };

  const handleSidebarSignOut = () => {
    showSignOutModal = true;
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
    showSignOutModal = false;
    await auth.signOut();
  };

  const closeSignOutModal = () => {
    showSignOutModal = false;
  };

  onMount(() => {
    const initializeDashboard = async () => {
      // Ensure light mode only
      document.documentElement.classList.remove('dark-mode');
      
      // Initialize current view from URL or localStorage
      initializeCurrentView();

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

    // Handle browser back/forward navigation
    const handlePopState = () => {
      initializeCurrentView();
    };

    window.addEventListener('popstate', handlePopState);

    // Initialize dashboard asynchronously
    initializeDashboard();

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });

  // Enforce access after admin check
  $: if (adminChecked) {
    const urlPath = window.location.pathname;
    if (urlPath.includes('/admin') && !isAdmin && currentView !== 'dashboard') {
      updateCurrentView('dashboard');
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
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <Sidebar 
        {currentView}
        {mobileSidebarOpen}
        {isAdmin}
        userName={userName}
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
        userInitial={userInitial}
        on:navigate={handleSidebarNavigate}
        on:closeMobileSidebar={handleSidebarClose}
        on:signOut={handleSidebarSignOut}
      />

      <!-- Main Content -->
      <main class="main-content">
        {#if showSingleDayView}
          <SingleDayView
            {selectedDate}
            {reservations}
            isAdmin={false}
            on:backToCalendar={handleBackToCalendar}
            on:reservationClick={handleReservationClick}
          />
        {:else if currentView === 'dashboard'}
          <DashboardHeader {userName} on:toggleMobileSidebar={toggleMobileSidebar} />

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
        {:else if currentView === 'reservation'}
          <Reservation on:toggleMobileSidebar={toggleMobileSidebar} />
        {:else if currentView === 'admin'}
          <AdminDashboard on:toggleMobileSidebar={toggleMobileSidebar} />
        {:else if currentView === 'admin-calendar'}
          <AdminDashboard on:toggleMobileSidebar={toggleMobileSidebar} />
        {:else if currentView === 'admin-users'}
          <AdminDashboard on:toggleMobileSidebar={toggleMobileSidebar} />
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
  showModal={showSignOutModal}
  on:confirm={handleSignOutConfirm}
  on:cancel={closeSignOutModal}
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
    color: white;
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