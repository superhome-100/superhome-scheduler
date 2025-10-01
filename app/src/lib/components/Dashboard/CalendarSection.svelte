<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { Calendar } from '@fullcalendar/core';
  import dayGridPlugin from '@fullcalendar/daygrid';

  const dispatch = createEventDispatcher();

  export let reservations: any[] = [];

  let calendarEl: HTMLDivElement;
  let calendar: Calendar | null = null;

  // Initialize calendar
  const initializeCalendar = () => {
    if (!calendarEl) return;

    // Destroy existing calendar if it exists
    if (calendar) {
      calendar.destroy();
    }

    // Create calendar events from reservations
    const events = reservations.map(reservationToCalendarEvent);

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
      displayEventTime: false, // avoid double time (we include time in title)
      height: 'auto',
      events: events,
      eventClick: (info) => {
        dispatch('eventClick', info.event.extendedProps.reservation);
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
            console.log('Date clicked:', dateStr);
            dispatch('dateClick', dateStr);
          }
        }
      }
    });
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'pool': return '#3b82f6';
      case 'open_water': return '#10b981';
      case 'classroom': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Re-initialize calendar when reservations change
  $: if (reservations) {
    setTimeout(initializeCalendar, 0);
  }

  // Convert reservation to calendar event
  const reservationToCalendarEvent = (reservation: any) => {
    const statusColors: Record<string, string> = {
      pending: '#fde68a', // lighter amber for better contrast
      confirmed: '#bbf7d0', // lighter green
      rejected: '#fecaca'   // lighter red
    };

    const typeMap: Record<string, string> = {
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

  const getStatusDisplay = (status: string) => {
    // Return the exact database enum values
    return status || 'pending';
  };

  onMount(() => {
    initializeCalendar();
    
    return () => {
      if (calendar) {
        calendar.destroy();
      }
    };
  });
</script>

<!-- Calendar Section -->
<div class="calendar-section">
  <div class="section-header">
    <h2 class="section-title">Calendar</h2>
  </div>
  <div class="calendar-container">
    <div id="calendar" bind:this={calendarEl}></div>
  </div>
</div>

<style>
  .calendar-section {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .calendar-container {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

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

  /* Mobile responsive */
  @media (max-width: 768px) {
    .calendar-section {
      padding: 1rem;
      margin-bottom: 1rem;
    }

    :global(.fc-header-toolbar) {
      padding: 0.75rem;
      flex-direction: column;
      gap: 0.75rem;
    }

    :global(.fc-toolbar-chunk) {
      display: flex;
      justify-content: center;
    }

    :global(.fc-button) {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }

    :global(.fc-toolbar-title) {
      font-size: 1rem;
    }
  }
</style>
