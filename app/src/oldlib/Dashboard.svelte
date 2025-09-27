<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, auth } from './auth';
  import { supabase } from './supabase';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import PullToRefresh from './PullToRefresh.svelte';
  import Reservation from './Reservation.svelte';
  import Sidebar from './Sidebar.svelte';
  import AdminDashboard from './AdminDashboard.svelte';
  import ReservationFormModal from './ReservationFormModal.svelte';
  import ReservationsListModal from './ReservationsListModal.svelte';
  import ReservationDetailsModal from './ReservationDetailsModal.svelte';
  import { Calendar } from '@fullcalendar/core';
  import dayGridPlugin from '@fullcalendar/daygrid';

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
  
  // Modal state management
  let showReservationsModal = false;
  let modalReservations: any[] = [];
  let modalTitle = 'Reservations';
  let showReservationForm = false;

  // Initialize current view from URL or localStorage
  const initializeCurrentView = () => {
    const urlPath = window.location.pathname;
    // Tentative until adminChecked

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
      console.log('Loaded reservations from database:', reservations);
    } catch (err) {
      console.error('Error loading reservations:', err);
      error = err instanceof Error ? err.message : 'Failed to load reservations';
    } finally {
      loading = false;
    }
  };
  
  // Get upcoming reservations (pending or confirmed, future dates)
  const getUpcomingReservations = () => {
    const now = new Date();
    return reservations.filter(r => {
      const resDate = new Date(r.res_date);
      return resDate > now && (r.res_status === 'pending' || r.res_status === 'confirmed');
    });
  };
  
  // Get completed reservations (past dates or rejected)
  const getCompletedReservations = () => {
    const now = new Date();
    return reservations.filter(r => {
      const resDate = new Date(r.res_date);
      return resDate <= now || r.res_status === 'rejected';
    });
  };
  
  // Type definitions
  type ReservationStatus = 'pending' | 'confirmed' | 'rejected';
  type ReservationType = 'pool' | 'open_water' | 'classroom';
  
  interface Reservation {
    uid: string;
    res_date: string;
    res_status: ReservationStatus;
    res_type: ReservationType;
    title?: string;
    description?: string;
    admin_notes?: string;
    approved_by?: string;
    approved_at?: string;
    created_at: string;
    updated_at: string;
  }

  // Convert reservation to calendar event
  const reservationToCalendarEvent = (reservation: Reservation) => {
    const statusColors: Record<ReservationStatus, string> = {
      pending: '#fde68a', // lighter amber for better contrast
      confirmed: '#bbf7d0', // lighter green
      rejected: '#fecaca'   // lighter red
    };

    const typeMap: Record<ReservationType, string> = {
      pool: 'Pool',
      open_water: 'Open Water',
      classroom: 'Classroom'
    };

    const d = new Date(reservation.res_date);
    const hour = d.getHours();
    const suffix = hour >= 12 ? 'pm' : 'am';
    let h12 = hour % 12; if (h12 === 0) h12 = 12;
    const timeShort = `${h12}${suffix}`;
    const typeLabel = typeMap[reservation.res_type] || reservation.res_type;
    const statusLabel = getStatusDisplay(reservation.res_status);

    return {
      id: `${reservation.uid}-${reservation.res_date}`,
      title: `${timeShort} ${typeLabel} ${statusLabel}`,
      start: reservation.res_date,
      backgroundColor: statusColors[reservation.res_status] || '#e5e7eb',
      borderColor: statusColors[reservation.res_status] || '#e5e7eb',
      textColor: '#0f172a',
      extendedProps: {
        reservation: { ...reservation } // Create a copy to avoid reference issues
      }
    };
  };

  const handleSignOut = async () => {
    const { error } = await auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
  };

  const openSignOutModal = () => {
    showSignOutModal = true;
  };

  const closeSignOutModal = () => {
    showSignOutModal = false;
  };

  const confirmSignOut = async () => {
    closeSignOutModal();
    await handleSignOut();
  };

  const toggleMobileSidebar = () => {
    mobileSidebarOpen = !mobileSidebarOpen;
  };

  const closeMobileSidebar = () => {
    mobileSidebarOpen = false;
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeMobileSidebar();
    }
  };

  const switchToReservation = () => {
    updateCurrentView('reservation');
    closeMobileSidebar();
  };

  const switchToDashboard = () => {
    updateCurrentView('dashboard');
    closeMobileSidebar();
  };

  const switchToAdmin = () => {
    updateCurrentView('admin');
    closeMobileSidebar();
  };

  const handleSidebarNavigate = (event: CustomEvent) => {
    const { view } = event.detail;
    if (view === 'dashboard') {
      switchToDashboard();
    } else if (view === 'reservation') {
      switchToReservation();
    } else if (view === 'admin') {
      switchToAdmin();
    }
  };

  const handleSidebarClose = () => {
    closeMobileSidebar();
  };

  const handleSidebarSignOut = () => {
    openSignOutModal();
  };

  const handleNewReservation = () => {
    showReservationForm = true;
  };

  const handleReservationCreated = () => {
    loadReservations();
    initializeCalendar();
    showReservationForm = false;
  };

  const closeReservationForm = () => {
    showReservationForm = false;
  };

  // Modal functions
  const openUpcomingReservationsModal = () => {
    modalReservations = transformReservationsForModal(getUpcomingReservations());
    modalTitle = 'Upcoming Reservations';
    showReservationsModal = true;
  };

  const openCompletedReservationsModal = () => {
    modalReservations = transformReservationsForModal(getCompletedReservations());
    modalTitle = 'Completed Reservations';
    showReservationsModal = true;
  };

  const closeReservationsModal = () => {
    showReservationsModal = false;
  };

  // Transform reservations to match modal format
  const transformReservationsForModal = (reservations: Reservation[]) => {
    return reservations.map(reservation => ({
      id: `${reservation.uid}-${reservation.res_date}`,
      type: getTypeDisplay(reservation.res_type),
      status: reservation.res_status === 'confirmed' ? 'approved' : reservation.res_status,
      date: reservation.res_date,
      startTime: new Date(reservation.res_date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      endTime: new Date(new Date(reservation.res_date).getTime() + 60 * 60 * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      timeOfDay: getTimeOfDay(new Date(reservation.res_date)),
      notes: reservation.description || '',
      title: reservation.title || '',
      // raw identifiers for details modal to fetch additional info
      uid: reservation.uid,
      res_date: reservation.res_date,
      res_type: reservation.res_type
    }));
  };

  const getTimeOfDay = (date: Date) => {
    const hour = date.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  // Handle reservation click for details modal
  const handleReservationClick = (reservation: any) => {
    console.log('Raw reservation data:', reservation);
    
    // Check if this is already transformed data from ReservationsListModal
    if (reservation.date && reservation.type && reservation.status) {
      // Data is already in modal format
      selectedReservation = reservation;
      console.log('Using pre-transformed reservation data:', selectedReservation);
      showReservationDetails = true;
      return;
    }
    
    // Handle raw database data
    const resDate = new Date(reservation.res_date);
    
    // Calculate duration based on reservation type
    let duration = 60; // Default 1 hour
    if (reservation.res_type === 'open_water') {
      duration = 240; // 4 hours for open water
    } else if (reservation.res_type === 'classroom') {
      duration = 120; // 2 hours for classroom
    }
    
    const endTime = new Date(resDate.getTime() + duration * 60 * 1000);
    
    // Transform database data to modal format
    selectedReservation = {
      id: reservation.id,
      date: resDate.toISOString().split('T')[0], // YYYY-MM-DD format
      startTime: resDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      endTime: endTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      type: getTypeDisplay(reservation.res_type),
      status: getStatusDisplay(reservation.res_status),
      timeOfDay: getTimeOfDay(resDate),
      notes: reservation.description || '',
      title: reservation.title || '',
      // pass raw identifiers
      uid: reservation.uid,
      res_date: reservation.res_date,
      res_type: reservation.res_type
    };
    
    console.log('Transformed reservation data:', selectedReservation);
    showReservationDetails = true;
  };

  const formatReservationDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusDisplay = (status: ReservationStatus) => {
    const statusMap: Record<ReservationStatus, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      rejected: 'Rejected'
    };
    return statusMap[status] || status;
  };
  
  const getTypeDisplay = (type: ReservationType) => {
    const typeMap: Record<ReservationType, string> = {
      pool: 'Pool',
      open_water: 'Open Water',
      classroom: 'Classroom'
    };
    return typeMap[type] || type;
  };

  // Handle refresh for dashboard view only
  const handleRefresh = async () => {
    try {
      refreshing = true;
      // Refresh dashboard data
      await loadReservations();
      setTimeout(() => {
        initializeCalendar();
      }, 100);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      refreshing = false;
    }
  };

  let calendar: Calendar;

  // Function to initialize calendar
  const initializeCalendar = () => {
    const calendarEl = document.getElementById('calendar');
    if (calendarEl && currentView === 'dashboard') {
      // Destroy existing calendar if it exists
      if (calendar) {
        calendar.destroy();
      }
      
      calendar = new Calendar(calendarEl, {
        plugins: [dayGridPlugin],
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        },
        dayHeaderFormat: { weekday: 'short' },
        displayEventTime: false, // avoid double time (we include time in title)
        height: 'auto',
        events: getUpcomingReservations().map(reservationToCalendarEvent),
        eventClick: function(info) {
          // Get reservation data from event extendedProps
          const reservation = info.event.extendedProps.reservation;
          if (reservation) {
            console.log('Calendar event clicked, reservation data:', reservation);
            handleReservationClick(reservation);
          }
        }
      });
      calendar.render();
    }
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

      // Load reservations and initialize calendar in parallel (non-blocking)
      try {
        await loadReservations();
        initializeCalendar();
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

  // Reactive statement to re-initialize calendar when view changes to dashboard
  $: if (currentView === 'dashboard') {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      initializeCalendar();
      computeMobileOverflow();
    }, 0);
  }

  // Recompute on tab change and when reservations change
  $: activeMobileTab, computeMobileOverflow();
  $: reservations, computeMobileOverflow();
  window.addEventListener('resize', computeMobileOverflow);
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
        <!-- Sticky Header -->
        <div class="dashboard-header">
          <div class="header-content">
            <div class="header-left">
              <button class="mobile-menu-toggle" on:click={toggleMobileSidebar} aria-label="Toggle menu">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
              </button>
              <div class="header-text">
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Welcome back, {userName}!</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Pull-to-Refresh Body -->
        <PullToRefresh onRefresh={handleRefresh} {refreshing}>
          <div class="dashboard-content">

        <div class="content-body">

          <!-- Mobile: Tabs container with Upcoming/Completed; View All appears at bottom only when list overflows -->
          <div class="mobile-reservations">
            <div class="reservation-section">
              <div class="tabs-row">
                <button 
                  class="tab-btn" 
                  class:active={activeMobileTab === 'upcoming'}
                  on:click={() => { activeMobileTab = 'upcoming'; }}
                  aria-pressed={activeMobileTab === 'upcoming'}
                >
                  <span>Upcoming</span>
                  <span class="indicator" class:active={activeMobileTab === 'upcoming'}></span>
                </button>
                <button 
                  class="tab-btn" 
                  class:active={activeMobileTab === 'completed'}
                  on:click={() => { activeMobileTab = 'completed'; }}
                  aria-pressed={activeMobileTab === 'completed'}
                >
                  <span>Completed</span>
                  <span class="indicator" class:active={activeMobileTab === 'completed'}></span>
                </button>
              </div>

              <div class="reservation-content">
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
                {:else if activeMobileTab === 'upcoming'}
                  {#if getUpcomingReservations().length > 0}
                    <div class="reservation-list compact mobile-scroll" bind:this={upcomingListEl} on:scroll={computeMobileOverflow}>
                      {#each getUpcomingReservations() as reservation}
                        <div 
                          class="reservation-item compact" 
                          on:click={() => handleReservationClick(reservation)}
                          on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
                          role="button"
                          tabindex="0"
                          aria-label="View reservation details"
                        >
                          <div class="compact-content">
                            <span class="compact-date">{new Date(reservation.res_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span class="compact-time">{new Date(reservation.res_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            <span class="type-badge compact" class:pool={reservation.res_type === 'pool'} class:openwater={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                              {getTypeDisplay(reservation.res_type)}
                            </span>
                            <span class="status-badge compact" class:confirmed={reservation.res_status === 'confirmed'} class:pending={reservation.res_status === 'pending'} class:rejected={reservation.res_status === 'rejected'}>
                              {getStatusDisplay(reservation.res_status)}
                            </span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <div class="empty-state">
                      <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                      </svg>
                      <p class="empty-text">No upcoming reservations</p>
                      <button class="create-first-btn" on:click={handleNewReservation}>Create your first reservation</button>
                    </div>
                  {/if}
                {:else}
                  {#if getCompletedReservations().length > 0}
                    <div class="reservation-list compact mobile-scroll" bind:this={completedListEl} on:scroll={computeMobileOverflow}>
                      {#each getCompletedReservations() as reservation}
                        <div 
                          class="reservation-item compact" 
                          on:click={() => handleReservationClick(reservation)}
                          on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
                          role="button"
                          tabindex="0"
                          aria-label="View reservation details"
                        >
                          <div class="compact-content">
                            <span class="compact-date">{new Date(reservation.res_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span class="compact-time">{new Date(reservation.res_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            <span class="type-badge compact" class:pool={reservation.res_type === 'pool'} class:openwater={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                              {getTypeDisplay(reservation.res_type)}
                            </span>
                            <span class="status-badge compact" class:confirmed={reservation.res_status === 'confirmed'} class:pending={reservation.res_status === 'pending'} class:rejected={reservation.res_status === 'rejected'}>
                              {getStatusDisplay(reservation.res_status)}
                            </span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <div class="empty-state">
                      <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <p class="empty-text">No completed reservations</p>
                    </div>
                  {/if}
                {/if}
              </div>

              {#if showMobileViewAll}
                <div class="mobile-view-all">
                  <button class="refresh-btn" on:click={activeMobileTab === 'upcoming' ? openUpcomingReservationsModal : openCompletedReservationsModal} aria-label="View all">
                    View All
                  </button>
                </div>
              {/if}
            </div>
          </div>

          <!-- Reservations Sections -->
          <div class="reservations-container">
            <!-- Upcoming Reservations -->
            <div class="reservation-section">
              <div class="section-header">
                <h2 class="section-title">Upcoming Reservations</h2>
                <button class="refresh-btn" on:click={openUpcomingReservationsModal}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
                  View All
                </button>
              </div>
              <div class="reservation-content">
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
                {:else if getUpcomingReservations().length > 0}
                  <div class="reservation-list compact">
                    {#each getUpcomingReservations().slice(0, 3) as reservation}
                      <div 
                        class="reservation-item compact" 
                        on:click={() => handleReservationClick(reservation)}
                        on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
                        role="button"
                        tabindex="0"
                        aria-label="View reservation details"
                      >
                        <div class="compact-content">
                          <span class="compact-date">{new Date(reservation.res_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span class="compact-time">{new Date(reservation.res_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          <span class="type-badge compact" class:pool={reservation.res_type === 'pool'} class:openwater={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                            {getTypeDisplay(reservation.res_type)}
                          </span>
                          <span class="status-badge compact" class:confirmed={reservation.res_status === 'confirmed'} class:pending={reservation.res_status === 'pending'} class:rejected={reservation.res_status === 'rejected'}>
                            {getStatusDisplay(reservation.res_status)}
                          </span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    <p class="empty-text">No upcoming reservations</p>
                    <button class="create-first-btn" on:click={handleNewReservation}>Create your first reservation</button>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Completed Reservations -->
            <div class="reservation-section">
              <div class="section-header">
                <h2 class="section-title">Completed Reservations</h2>
                <button class="refresh-btn" on:click={openCompletedReservationsModal}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
                  View All
                </button>
              </div>
              <div class="reservation-content">
                {#if loading}
                  <div class="loading-state">
                    <LoadingSpinner size="md" />
                    <p>Loading reservations...</p>
                  </div>
                {:else if getCompletedReservations().length > 0}
                  <div class="reservation-list compact">
                    {#each getCompletedReservations().slice(0, 2) as reservation}
                      <div 
                        class="reservation-item compact" 
                        on:click={() => handleReservationClick(reservation)}
                        on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
                        role="button"
                        tabindex="0"
                        aria-label="View reservation details"
                      >
                        <div class="compact-content">
                          <span class="compact-date">{new Date(reservation.res_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span class="compact-time">{new Date(reservation.res_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          <span class="type-badge compact" class:pool={reservation.res_type === 'pool'} class:openwater={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                            {getTypeDisplay(reservation.res_type)}
                          </span>
                          <span class="status-badge compact" class:confirmed={reservation.res_status === 'confirmed'} class:pending={reservation.res_status === 'pending'} class:rejected={reservation.res_status === 'rejected'}>
                            {getStatusDisplay(reservation.res_status)}
                          </span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p class="empty-text">No completed reservations</p>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Calendar Section -->
          <div class="calendar-section">
            <div class="section-header">
              <h2 class="section-title">Calendar</h2>
            </div>
            <div class="calendar-container">
              <div id="calendar"></div>
            </div>
          </div>
        </div>
        
        <!-- Floating Action Button: New Reservation -->
        <div class="fab-container" aria-hidden="false">
          <button 
            class="fab-btn" 
            on:click={handleNewReservation}
            aria-label="Add new reservation"
            title="Add new reservation"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span class="fab-text"> New Reservation</span>
          </button>
        </div>

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

<!-- Reservation Form -->
<ReservationFormModal 
  bind:this={reservationForm}
  isOpen={showReservationForm}
  on:submit={handleReservationCreated}
  on:close={closeReservationForm}
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

<!-- Sign Out Confirmation Modal -->
{#if showSignOutModal}
  <div 
    class="modal-overlay" 
    on:click={closeSignOutModal}
    on:keydown={(e) => e.key === 'Escape' && closeSignOutModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Confirm Sign Out"
    tabindex="-1"
  >
    <div 
      class="modal-content sign-out-modal" 
      role="document"
    >
      <div class="modal-header">
        <h2 class="modal-title">Sign Out</h2>
        <button 
          class="modal-close" 
          on:click={closeSignOutModal}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="sign-out-content">
          <div class="sign-out-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </div>
          <p class="sign-out-message">
            Are you sure you want to sign out? You'll need to sign in again to access your dashboard.
          </p>
        </div>
        <div class="modal-actions">
          <button 
            class="btn btn-secondary" 
            on:click={closeSignOutModal}
          >
            Cancel
          </button>
          <button 
            class="btn btn-danger" 
            on:click={confirmSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Reservation Details Modal -->
<ReservationDetailsModal 
  isOpen={showReservationDetails}
  reservation={selectedReservation}
  on:close={() => showReservationDetails = false}
/>

<style>
  .dashboard-container {
    min-height: 100vh;
    background: #f8fafc;
  }

  /* Dashboard Layout */
  .dashboard-layout {
    display: flex;
    min-height: 100vh;
    width: 100%;
    /* removed overflow hidden so sidebar sticky works */
  }



  /* Main Content */
  .main-content {
    flex: 1 1 auto;
    min-width: 0; /* allow shrinking in flex to avoid overflow */
    display: flex;
    flex-direction: column;
    background: #f8fafc;
    overflow-x: hidden; /* prevent horizontal scroll while allowing sidebar sticky */
  }

  .dashboard-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-content {
    padding: 2rem 2rem 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 120px; /* set a fixed height */
  }


  /* FullCalendar event readability */
  :global(.fc .fc-daygrid-event) {
    color: #0f172a; /* slate-900 */
    font-weight: 600;
    border-radius: 8px;
  }
  :global(.fc .fc-daygrid-event .fc-event-title) {
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.fc .fc-daygrid-event-dot) { display: none; }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .page-subtitle {
    font-size: 1rem;
    color: #64748b;
    margin: 0;
  }

  .content-body {
    flex: 1;
    padding: 2rem;
  }

  /* Reservations Container */
  .reservations-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    width: 100%;
  }

  /* Reservation Section */
  .reservation-section {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .reservation-content {
    padding: 1.5rem;
    min-height: 200px;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #64748b;
  }

  .empty-icon {
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .create-first-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-first-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  /* Floating Action Button */
  .fab-container {
    position: fixed;
    right: 1rem;
    bottom: 2rem; /* higher from bottom on small screens */
    z-index: 100; /* above content but below modals */
    pointer-events: none; /* allow only the button to capture */
  }

  .fab-btn {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #3b82f6;
    color: white;
    border: none;
    width: 56px;
    height: 56px;
    border-radius: 50%; /* round on small screens */
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
  }

  .fab-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(59, 130, 246, 0.45);
    background: #2563eb;
  }

  .fab-btn:active {
    transform: translateY(0);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
  }

  .fab-btn:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35), 0 8px 20px rgba(59, 130, 246, 0.35);
  }

  .fab-text {
    display: none; /* icon-only by default on small screens */
  }

  @media (min-width: 768px) {
    .fab-container { right: 1.5rem; bottom: 2.5rem; } /* slightly higher on desktop */
    .fab-btn { 
      padding: 0.9rem 1.1rem; 
      width: auto; 
      height: auto; 
      border-radius: 9999px; /* pill on larger screens */
      gap: 0.5rem;
    }
    .fab-text { display: inline; font-weight: 600; font-size: 0.95rem; }
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #64748b;
    gap: 0.5rem;
  }

  .loading-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Compact reservation styles */
  .reservation-list.compact {
    gap: 0.5rem;
    max-height: 240px; /* Approximately 3 items * 80px height */
    overflow-y: auto;
  }

  /* Mobile-specific */
  .mobile-reservations { display: none; }

  @media (max-width: 768px) {
    .reservations-container, .calendar-section { display: none; }
    .mobile-reservations { display: block; }
    .content-body { padding: 1rem; }

    .reservation-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .tabs-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 0.75rem;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #0f172a;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }

    .indicator { width: 8px; height: 8px; border-radius: 9999px; background: #cbd5e1; }
    .indicator.active { background: #22c55e; }

    .reservation-content { padding: 1rem; }

    .mobile-scroll {
      max-height: calc(70vh - 180px);
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    .mobile-view-all {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1rem 1rem 1rem;
      background: white;
      border-top: 1px solid #e2e8f0;
    }
  }

  .reservation-item.compact {
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .reservation-item.compact:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  .compact-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .compact-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    min-width: 3rem;
  }

  .compact-time {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    min-width: 4rem;
  }

  .type-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
  }

  .status-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
  }

  /* Reservation List */
  .reservation-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .reservation-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .reservation-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }



  .type-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-badge.pool {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .type-badge.openwater {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .type-badge.classroom {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.confirmed {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .status-badge.pending {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }

  .status-badge.rejected {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }



  /* Calendar Section */
  .calendar-section {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    margin-top: 2rem;
  }

  .calendar-container {
    padding: 1.5rem;
  }

  #calendar {
    width: 100%;
  }

  /* FullCalendar Custom Styles */
  :global(.fc) {
    font-family: inherit;
  }

  :global(.fc-toolbar-title) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
  }

  :global(.fc-button) {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    border-radius: 6px;
    font-weight: 500;
    padding: 0.5rem 1rem;
  }

  :global(.fc-button:hover) {
    background: #e2e8f0;
    color: #1e293b;
  }

  :global(.fc-button:focus) {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  :global(.fc-button-primary:not(:disabled):active) {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  :global(.fc-daygrid-day-number) {
    color: #1e293b;
    font-weight: 500;
  }

  :global(.fc-day-today) {
    background: #f0f9ff;
  }

  :global(.fc-daygrid-day-number:hover) {
    color: #3b82f6;
  }

  :global(.fc-col-header-cell) {
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    padding: 0.75rem 0;
  }

  :global(.fc-col-header-cell-cushion) {
    color: #475569;
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }



  /* Error State */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    color: #e53e3e;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .sign-out-modal {
    max-width: 400px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2d3748;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    color: #718096;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: #edf2f7;
    color: #4a5568;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .sign-out-content {
    text-align: center;
    padding: 1rem 0;
  }

  .sign-out-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
    color: #e53e3e;
  }

  .sign-out-message {
    font-size: 1rem;
    color: #4a5568;
    line-height: 1.5;
    margin: 0;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 100px;
  }

  .btn-secondary {
    background: #edf2f7;
    color: #4a5568;
    border: 1px solid #e2e8f0;
  }

  .btn-secondary:hover {
    background: #e2e8f0;
  }

  .btn-danger {
    background: #e53e3e;
    color: white;
  }

  .btn-danger:hover {
    background: #c53030;
    transform: translateY(-1px);
  }

  /* Mobile Toggle Button */
  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
    margin-right: 1rem;
  }

  .mobile-menu-toggle:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .header-left {
    display: flex;
    align-items: center;
  }

  .header-text {
    flex: 1;
  }



  /* Mobile Responsive */
  @media (max-width: 768px) {
    .dashboard-layout {
      flex-direction: column;
    }

    .mobile-menu-toggle {
      display: block;
    }


    .content-body {
      padding: 1rem;
    }

    .reservations-container {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .reservation-content {
      min-height: 150px;
    }

    .calendar-section {
      margin-top: 1.5rem;
    }

    .calendar-container {
      padding: 1rem;
    }

    :global(.fc-toolbar) {
      flex-direction: column;
      gap: 1rem;
    }

    :global(.fc-toolbar-chunk) {
      display: flex;
      justify-content: center;
    }

    .modal-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
