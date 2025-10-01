<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Calendar } from '@fullcalendar/core';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import { createEventDispatcher } from 'svelte';

  export let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';
  export let reservations: any[] = [];

  const dispatch = createEventDispatcher();

  let calendar: Calendar | null = null;
  let calendarEl: HTMLElement;

  // Get upcoming reservations (pending or confirmed, future dates)
  const getUpcomingReservations = () => {
    const now = new Date();
    return reservations.filter(r => {
      const resDate = new Date(r.res_date);
      return resDate > now && (r.res_status === 'pending' || r.res_status === 'confirmed');
    });
  };

  const getEventsForType = (type: 'pool' | 'openwater' | 'classroom') => {
    const typeMapping = {
      'pool': 'pool',
      'openwater': 'open_water',
      'classroom': 'classroom'
    };
    
    // Filter by type AND only show upcoming reservations
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

  const initializeCalendar = () => {
    if (calendarEl) {
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
        height: 'auto',
        events: getEventsForType(selectedType),
        eventClick: function(info) {
          // Get reservation data from event extendedProps
          const reservation = info.event.extendedProps.reservation;
          if (reservation) {
            dispatch('reservationClick', reservation);
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
            console.log('Reservation Calendar - Date clicked:', dateStr, 'type:', selectedType);
            dispatch('dateClick', { date: dateStr, type: selectedType });
          }
        }
      }
    });
    }
  };

  const getSectionTitle = () => {
    switch (selectedType) {
      case 'pool':
        return 'Pool Calendar';
      case 'openwater':
        return 'Open Water Calendar';
      case 'classroom':
        return 'Classroom Calendar';
      default:
        return 'Calendar';
    }
  };

  // Re-initialize calendar when selectedType or reservations change
  $: if (selectedType && reservations) {
    setTimeout(() => {
      initializeCalendar();
    }, 100);
  }

  onMount(() => {
    initializeCalendar();
  });

  onDestroy(() => {
    if (calendar) {
      calendar.destroy();
    }
  });
</script>

<!-- Calendar Section -->
<div class="calendar-section">
  <div class="section-header">
    <h2 class="section-title">
      {getSectionTitle()}
    </h2>
  </div>
  <div class="calendar-container">
    <div bind:this={calendarEl} id="{selectedType}-calendar" class="calendar"></div>
  </div>
</div>

<style>
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

  /* Mobile Responsive */
  @media (max-width: 768px) {
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
</style>
