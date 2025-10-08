<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { Calendar } from '@fullcalendar/core';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import AdminCalendarTypeButtons from './AdminCalendarTypeButtons.svelte';

  const dispatch = createEventDispatcher();

  export let reservations: any[] = [];
  export let loading = false;

  let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';

  // Initialize from URL parameter on mount
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam && ['pool', 'openwater', 'classroom'].includes(typeParam)) {
      selectedType = typeParam as 'pool' | 'openwater' | 'classroom';
    }
  });

  let calendarEl: HTMLDivElement;
  let calendar: Calendar | null = null;

  // Handle type selection
  const handleTypeSelected = (event: CustomEvent) => {
    selectedType = event.detail.type;
  };

  // Initialize calendar
  const initializeCalendar = () => {
    if (!calendarEl) return;

    // Destroy existing calendar if it exists
    if (calendar) {
      calendar.destroy();
    }

    // Filter reservations based on selected type
    const filteredReservations = reservations.filter(reservation => {
      if (selectedType === 'pool') return reservation.res_type === 'pool';
      if (selectedType === 'openwater') return reservation.res_type === 'open_water';
      if (selectedType === 'classroom') return reservation.res_type === 'classroom';
      return false;
    });

    // Create calendar events from filtered reservations
    const events = filteredReservations.map(reservationToCalendarEvent);

    // Initialize FullCalendar
    calendar = new Calendar(calendarEl, {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek'
      },
      dayHeaderFormat: { weekday: 'short' },
      displayEventTime: false,
      height: 'auto',
      dayMaxEvents: 3, // Show max 3 events, then show "more" link
      events: events,
      moreLinkClick: (info) => {
        // When "more" link is clicked, dispatch dateClick to show Single Day View
        const dateStr = info.date.toISOString().split('T')[0];
        console.log('Admin Calendar - More link clicked for date:', dateStr);
        dispatch('dateClick', { date: dateStr, type: selectedType });
      },
      eventDidMount: (info) => {
        // Add custom styling based on reservation type and status
        const reservation = info.event.extendedProps.reservation;
        const element = info.el;
        
        // Add type-specific styling
        if (reservation.res_type === 'pool') {
          element.style.borderLeft = '4px solid #3b82f6';
        } else if (reservation.res_type === 'open_water') {
          element.style.borderLeft = '4px solid #10b981';
        } else if (reservation.res_type === 'classroom') {
          element.style.borderLeft = '4px solid #ef4444';
        }

        // Add status indicator
        if (reservation.res_status === 'pending') {
          element.style.borderTop = '3px solid #f59e0b';
        } else if (reservation.res_status === 'confirmed') {
          element.style.borderTop = '3px solid #10b981';
        } else if (reservation.res_status === 'rejected') {
          element.style.borderTop = '3px solid #ef4444';
        }
      }
    });

    calendar.render();
    
    // Add custom date click handler using DOM events
    const calendarElement = calendarEl;
    calendarElement.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Check if the clicked element is a day cell (not an event)
      if (target.classList.contains('fc-daygrid-day') || 
          target.closest('.fc-daygrid-day')) {
        
        // Find the date from the day cell
        const dayCell = target.closest('.fc-daygrid-day');
        if (dayCell) {
          const dateStr = dayCell.getAttribute('data-date');
          if (dateStr) {
            console.log('Admin Calendar - Date clicked:', dateStr);
            dispatch('dateClick', { date: dateStr, type: selectedType });
          }
        }
      }
    });
  };

  const getEventColor = (type: string, status: string) => {
    const baseColors: Record<string, string> = {
      pool: '#3b82f6',
      open_water: '#10b981',
      classroom: '#ef4444'
    };

    const statusModifiers: Record<string, number> = {
      pending: 0.7,
      confirmed: 1.0,
      rejected: 0.5
    };

    const baseColor = baseColors[type] || '#6b7280';
    const modifier = statusModifiers[status] || 0.8;
    
    return baseColor;
  };

  // Re-initialize calendar when reservations or selected type change
  $: if (reservations || selectedType) {
    setTimeout(initializeCalendar, 0);
  }

  // Convert reservation to calendar event
  const reservationToCalendarEvent = (reservation: any) => {
    const statusColors: Record<string, string> = {
      pending: '#fde68a',
      confirmed: '#bbf7d0',
      rejected: '#fecaca'
    };

    const typeMap: Record<string, string> = {
      pool: 'Pool',
      open_water: 'Open Water',
      classroom: 'Classroom'
    };

    const d = new Date(reservation.res_date);
    const hour = d.getHours();
    const suffix = hour >= 12 ? 'pm' : 'am';
    let h12 = hour % 12; 
    if (h12 === 0) h12 = 12;
    const timeShort = `${h12}${suffix}`;
    const typeLabel = typeMap[reservation.res_type] || reservation.res_type;
    const statusLabel = getStatusDisplay(reservation.res_status);
    const userName = reservation.user_profiles?.name || 'Unknown User';

    return {
      id: `${reservation.uid}-${reservation.res_date}`,
      title: `${timeShort} ${typeLabel} - ${userName}`,
      start: reservation.res_date,
      backgroundColor: statusColors[reservation.res_status] || '#e5e7eb',
      borderColor: getEventColor(reservation.res_type, reservation.res_status),
      textColor: '#0f172a',
      extendedProps: {
        reservation: { ...reservation }
      }
    };
  };

  const getStatusDisplay = (status: string) => {
    return status || 'pending';
  };


  // Reactive section title that updates when selectedType changes
  $: sectionTitle = (() => {
    switch (selectedType) {
      case 'pool':
        return 'Pool Calendar';
      case 'openwater':
        return 'Open Water Calendar';
      case 'classroom':
        return 'Classroom Calendar';
      default:
        return 'Pool Calendar';
    }
  })();

  onMount(() => {
    initializeCalendar();
    
    return () => {
      if (calendar) {
        calendar.destroy();
      }
    };
  });
</script>

<div class="bg-white rounded-xl shadow-sm p-6 mb-8">
  <!-- Calendar Type Buttons -->
  <AdminCalendarTypeButtons 
    bind:selectedType 
    on:typeSelected={handleTypeSelected}
  />

  <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
    <h2 class="text-xl font-semibold m-0" style="color: #00294C;">{sectionTitle}</h2>
  </div>
  
  <div class="relative rounded-lg overflow-hidden border border-slate-200 min-h-[400px] md:min-h-[600px]">
    {#if loading}
      <div class="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
        <div class="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-600">Loading calendar...</p>
      </div>
    {/if}
    <div id="admin-calendar" bind:this={calendarEl}></div>
  </div>
  
  <div class="flex flex-wrap gap-6 mt-4 pt-4 border-t border-slate-200 justify-center md:justify-start">
    <div class="flex items-center gap-2 text-sm text-slate-500">
      <div class="w-3 h-3 rounded-sm bg-amber-200"></div>
      <span>Pending</span>
    </div>
    <div class="flex items-center gap-2 text-sm text-slate-500">
      <div class="w-3 h-3 rounded-sm bg-green-200"></div>
      <span>Confirmed</span>
    </div>
    <div class="flex items-center gap-2 text-sm text-slate-500">
      <div class="w-3 h-3 rounded-sm bg-red-200"></div>
      <span>Rejected</span>
    </div>
  </div>
</div>

<style>
  /* Fixed size date boxes */
  :global(.fc-daygrid-day) {
    min-height: 120px !important;
    height: 120px !important;
  }

  :global(.fc-daygrid-day-frame) {
    height: 100% !important;
  }

  /* Style the "more" link as a badge */
  :global(.fc-daygrid-more-link) {
    background: #3b82f6 !important;
    color: hsl(var(--bc)) !important;
    border-radius: 12px !important;
    padding: 2px 8px !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    text-decoration: none !important;
    display: inline-block !important;
    margin-top: 4px !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
  }

  :global(.fc-daygrid-more-link:hover) {
    background: #2563eb !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3) !important;
  }

  /* Ensure events don't overflow the fixed height */
  :global(.fc-daygrid-day-events) {
    max-height: calc(100% - 20px) !important;
    overflow: hidden !important;
  }

  /* FullCalendar customizations */
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
    color: hsl(var(--bc));
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

  /* Event styling */
  :global(.fc .fc-daygrid-event) {
    color: #0f172a;
    font-weight: 600;
    border-radius: 6px;
    font-size: 0.75rem;
  }

  :global(.fc .fc-daygrid-event .fc-event-title) {
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.fc .fc-daygrid-event-dot) { 
    display: none; 
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    /* Mobile: smaller date boxes */
    :global(.fc-daygrid-day) {
      min-height: 80px !important;
      height: 80px !important;
    }

    :global(.fc-daygrid-more-link) {
      font-size: 0.625rem !important;
      padding: 1px 6px !important;
    }
  }
</style>
