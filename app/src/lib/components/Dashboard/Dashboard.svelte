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
  
  // Dashboard sub-components
  import DashboardHeader from './DashboardHeader.svelte';
  import DesktopReservations from './DesktopReservations.svelte';
  import MobileReservations from './MobileReservations.svelte';
  import CalendarSection from './CalendarSection.svelte';
  import FloatingActionButton from './FloatingActionButton.svelte';
  import SignOutModal from './SignOutModal.svelte';
  
  // Dashboard utilities
  import { getUpcomingReservations, getCompletedReservations, transformReservationsForModal } from './dashboardUtils';

  let showSignOutModal = false;
  let mobileSidebarOpen = false;
  let showUpcomingModal = false;
  let showCompletedModal = false;
  let showReservationDetails = false;
  let selectedReservation: any = null;
  let currentView = 'dashboard'; // 'dashboard', 'reservation', or 'admin'
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
      // Tentatively set admin; enforcement after admin check
      currentView = 'admin';
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
    const newUrl = newView === 'dashboard' ? '/' : `/${newView}`;
    window.history.pushState({}, '', newUrl);
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

  const handleCalendarEventClick = (event: CustomEvent) => {
    const reservation = event.detail;
    // Calendar provides raw DB reservation; transform to modal shape
    const [transformed] = transformReservationsForModal([reservation]);
    handleReservationClick(transformed);
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

  const handleReservationClick = (reservation: any) => {
    console.log('Dashboard: Received reservationClick from main dashboard:', reservation);
    console.log('Dashboard: Has date field?', reservation && 'date' in reservation);
    console.log('Dashboard: Reservation fields:', reservation ? Object.keys(reservation) : 'null');
    
    // Guarantee modal shape. If date field missing, transform from raw DB row
    if (reservation && !('date' in reservation)) {
      console.log('Dashboard: Transforming main dashboard reservation data');
      const [transformed] = transformReservationsForModal([reservation]);
      console.log('Dashboard: Transformed reservation:', transformed);
      console.log('Dashboard: Transformed fields:', transformed ? Object.keys(transformed) : 'null');
      selectedReservation = transformed;
    } else {
      console.log('Dashboard: Using main dashboard reservation as-is');
      selectedReservation = reservation;
    }
    showReservationDetails = true;
    console.log('Dashboard: Set showReservationDetails to true');
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
        {#if currentView === 'dashboard'}
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
                <CalendarSection 
                  {reservations}
                  on:eventClick={handleCalendarEventClick}
                />
              </div>
              
              <!-- Floating Action Button -->
              <FloatingActionButton on:newReservation={handleNewReservation} />

              <!-- App Footer for dashboard -->
              <footer class="app-footer">
                © {new Date().getFullYear()} SuperHOME • Pull down to refresh
              </footer>
            </div>
          </PullToRefresh>
        {:else if currentView === 'reservation'}
          <Reservation on:toggleMobileSidebar={toggleMobileSidebar} />
        {:else if currentView === 'admin'}
          <AdminDashboard on:toggleMobileSidebar={toggleMobileSidebar} />
        {/if}

        <!-- App Footer for non-dashboard views -->
        {#if currentView !== 'dashboard'}
        <footer class="app-footer">
          © {new Date().getFullYear()} SuperHOME
        </footer>
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
  on:reservationClick={(event) => handleReservationClick(event.detail)}
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
    min-height: 100vh;
    background: #f8fafc;
  }

  .dashboard-layout {
    display: flex;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
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

  .app-footer {
    text-align: center;
    padding: 1rem;
    color: #64748b;
    font-size: 0.875rem;
    border-top: 1px solid #e2e8f0;
    background: white;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .dashboard-content {
      padding: 1rem;
    }

    .content-body {
      gap: 1rem;
    }
  }
</style>