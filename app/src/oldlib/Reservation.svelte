<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from './auth';
  import { supabase } from './supabase';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import PullToRefresh from './PullToRefresh.svelte';
  import ReservationFormModal from './ReservationFormModal.svelte';
  import ReservationDetailsModal from './ReservationDetailsModal.svelte';
  import { Calendar } from '@fullcalendar/core';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let mobileSidebarOpen = false;
  let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';
  let poolCalendar: Calendar;
  let openwaterCalendar: Calendar;
  let classroomCalendar: Calendar;
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
      
      // Re-initialize calendar after loading data
      setTimeout(() => {
        initializeCalendar();
      }, 100);
      
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

  const handleReservationClick = (reservation: any) => {
    console.log('Raw reservation data:', reservation);
    
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
      title: reservation.title || ''
    };
    
    console.log('Transformed reservation data:', selectedReservation);
    showDetailsModal = true;
  };

  const getTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      pool: 'Pool',
      open_water: 'Open Water',
      classroom: 'Classroom'
    };
    return typeMap[type] || type;
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      confirmed: 'approved',
      rejected: 'rejected'
    };
    return statusMap[status] || status;
  };

  const getTimeOfDay = (date: Date) => {
    const hour = date.getHours();
    if (hour < 12) return 'AM';
    if (hour < 17) return 'PM';
    return 'PM';
  };

  const handleDetailsModalClose = () => {
    showDetailsModal = false;
    selectedReservation = null;
  };

  const selectType = (type: 'pool' | 'openwater' | 'classroom') => {
    selectedType = type;
    // Initialize calendar after DOM update
    setTimeout(() => {
      initializeCalendar();
    }, 0);
  };

  const initializeCalendar = () => {
    const calendarEl = document.getElementById(`${selectedType}-calendar`);
    if (calendarEl) {
      // Destroy existing calendar if it exists
      if (selectedType === 'pool' && poolCalendar) {
        poolCalendar.destroy();
      } else if (selectedType === 'openwater' && openwaterCalendar) {
        openwaterCalendar.destroy();
      } else if (selectedType === 'classroom' && classroomCalendar) {
        classroomCalendar.destroy();
      }
      
      const calendar = new Calendar(calendarEl, {
        plugins: [dayGridPlugin],
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        },
        dayHeaderFormat: { weekday: 'short' },
        height: 'auto',
        events: getEventsForType(selectedType),
        eventClick: function(info) {
          // Get reservation data from event extendedProps
          const reservation = info.event.extendedProps.reservation;
          if (reservation) {
            handleReservationClick(reservation);
          }
        }
      });
      
      // Store calendar reference
      if (selectedType === 'pool') {
        poolCalendar = calendar;
      } else if (selectedType === 'openwater') {
        openwaterCalendar = calendar;
      } else if (selectedType === 'classroom') {
        classroomCalendar = calendar;
      }
      
      calendar.render();
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

  const getEventsForType = (type: 'pool' | 'openwater' | 'classroom') => {
    const typeMapping = {
      'pool': 'pool',
      'openwater': 'open_water',
      'classroom': 'classroom'
    };
    
    // Filter by type AND only show upcoming reservations (like Dashboard)
    const filteredReservations = getUpcomingReservations().filter(r => r.res_type === typeMapping[type]);
    return filteredReservations.map(reservationToCalendarEvent);
  };

  // Convert reservation to calendar event
  const reservationToCalendarEvent = (reservation: any) => {
    const statusColors: Record<string, string> = {
      pending: '#f59e0b',
      confirmed: '#10b981',
      rejected: '#ef4444'
    };
    
    const typeColors: Record<string, string> = {
      pool: '#3b82f6',
      open_water: '#10b981',
      classroom: '#ef4444'
    };
    
    return {
      id: `${reservation.uid}-${reservation.res_date}`,
      title: reservation.title || `${reservation.res_type} Reservation`,
      start: reservation.res_date,
      backgroundColor: statusColors[reservation.res_status] || typeColors[reservation.res_type] || '#6b7280',
      borderColor: statusColors[reservation.res_status] || typeColors[reservation.res_type] || '#6b7280',
      extendedProps: {
        reservation
      }
    };
  };

  onMount(() => {
    // Ensure light mode only
    document.documentElement.classList.remove('dark-mode');
    
    // Load reservations and initialize calendar
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
    <div class="reservation-header">
      <div class="header-content">
        <div class="header-left">
          <button class="mobile-menu-toggle" on:click={toggleMobileSidebar} aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
          <div class="header-text">
            <h1 class="page-title">Reservations</h1>
            <p class="page-subtitle">Manage your reservations</p>
          </div>
        </div>
      </div>
    </div>

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
            <div class="reservation-type-buttons">
              <button 
                class="type-btn" 
                class:active={selectedType === 'pool'} 
                on:click={() => selectType('pool')}
                title="Pool Reservations"
              >
                <svg class="type-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <span class="type-text">Pool</span>
              </button>
              <button 
                class="type-btn" 
                class:active={selectedType === 'openwater'} 
                on:click={() => selectType('openwater')}
                title="Open Water Reservations"
              >
                <svg class="type-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <span class="type-text">Open Water</span>
              </button>
              <button 
                class="type-btn" 
                class:active={selectedType === 'classroom'} 
                on:click={() => selectType('classroom')}
                title="Classroom Reservations"
              >
                <svg class="type-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <span class="type-text">Classroom</span>
              </button>
            </div>

            <!-- Calendar Section -->
            <div class="calendar-section">
              <div class="section-header">
                <h2 class="section-title">
                  {#if selectedType === 'pool'}
                    Pool Calendar
                  {:else if selectedType === 'openwater'}
                    Open Water Calendar
                  {:else if selectedType === 'classroom'}
                    Classroom Calendar
                  {/if}
                </h2>
              </div>
              <div class="calendar-container">
                <div id="{selectedType}-calendar" class="calendar"></div>
              </div>
            </div>
          {/if}
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

  .reservation-header {
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
    height: 120px;
  }


  .header-left {
    display: flex;
    align-items: center;
  }

  .header-text {
    flex: 1;
  }

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

  /* Floating Action Button (FAB) */
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
    border-radius: 50%;
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

  .fab-text { display: none; }

  .content-body {
    flex: 1;
    padding: 2rem;
  }

  /* Reservation Type Buttons */
  .reservation-type-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .type-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
  }

  .type-icon {
    flex-shrink: 0;
  }

  .type-text {
    white-space: nowrap;
  }

  .type-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #f8fafc;
  }

  .type-btn.active {
    border-color: #3b82f6;
    background: #3b82f6;
    color: white;
  }

  .type-btn.active:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  /* Calendar Section */
  .calendar-section {
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
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .calendar-container {
    padding: 1.5rem;
  }

  .calendar {
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
    .mobile-menu-toggle {
      display: block;
    }


    .content-body {
      padding: 1rem;
    }


    .fab-container { right: 1.25rem; bottom: 2.25rem; }

    .reservation-type-buttons {
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
    }

    .type-btn {
      width: auto;
      min-width: auto;
      padding: 0.75rem;
      border-radius: 50%;
      aspect-ratio: 1;
      justify-content: center;
    }

    .type-text {
      display: none;
    }

    .type-icon {
      width: 24px;
      height: 24px;
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
  }

  /* Desktop and larger: emphasize FAB with label and pill shape */
  @media (min-width: 768px) {
    .fab-container { right: 1.5rem; bottom: 2.5rem; }
    .fab-btn {
      padding: 0.9rem 1.1rem;
      width: auto;
      height: auto;
      border-radius: 9999px; /* pill */
      gap: 0.5rem;
    }
    .fab-text { display: inline; font-weight: 600; font-size: 0.95rem; }
  }
</style>
