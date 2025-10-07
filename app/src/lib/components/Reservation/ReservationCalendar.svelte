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
    if (!calendarEl) return;

    // Destroy existing calendar if it exists
    if (calendar) {
      calendar.destroy();
    }

    // Filter reservations based on selected type
    const typeMapping = {
      'pool': 'pool',
      'openwater': 'open_water',
      'classroom': 'classroom'
    };

    const filteredReservations = getUpcomingReservations().filter(reservation => {
      return reservation.res_type === typeMapping[selectedType];
    });

    // Create calendar events from filtered reservations
    const events = filteredReservations.map(reservationToCalendarEvent);

    console.log(`Calendar: Initializing for type ${selectedType}, found ${filteredReservations.length} reservations`);

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
      height: 'auto',
      events: events,
      eventClick: (info) => {
        dispatch('reservationClick', info.event.extendedProps.reservation);
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

  // Re-initialize calendar when reservations or selected type change
  $: if (reservations || selectedType) {
    setTimeout(initializeCalendar, 0);
  }

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
<div class="bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden">
  <div class="flex items-center justify-between px-6 py-4 border-b border-base-300">
    <h2 class="text-xl font-semibold text-base-content">
      {getSectionTitle()}
    </h2>
  </div>
  <div class="p-6">
    <div bind:this={calendarEl} class="w-full"></div>
  </div>
</div>

