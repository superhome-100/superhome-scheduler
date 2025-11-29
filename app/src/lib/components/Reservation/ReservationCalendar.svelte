<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { Calendar } from '@fullcalendar/core';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import { ReservationType } from '../../types/reservations';

  const dispatch = createEventDispatcher();

  export let reservations: any[] = [];
  export let stats: any[] = [];
  export let loading = false;
  export let selectedType: ReservationType = ReservationType.openwater;

  let calendarEl: HTMLDivElement;
  let calendar: Calendar | null = null;

  // Initialize calendar
  const initializeCalendar = () => {
    if (!calendarEl) return;

    // Destroy existing calendar if it exists
    if (calendar) {
      calendar.destroy();
    }

    // Filter reservations based on selected type
    const filteredReservations = reservations.filter(reservation => {
      if (selectedType === ReservationType.pool) return reservation.res_type === 'pool';
      if (selectedType === ReservationType.openwater) return reservation.res_type === 'open_water';
      if (selectedType === ReservationType.classroom) return reservation.res_type === 'classroom';
      return false;
    });

    // Group reservations by date and create participant count events
    const groupedReservations = groupReservationsByDate(filteredReservations);
    const events = createParticipantCountEvents(groupedReservations);

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
        console.log('Reservation Calendar - More link clicked for date:', dateStr);
        dispatch('dateClick', { date: dateStr, type: selectedType });
      },
      eventDidMount: (info) => {
        const element = info.el;
        const extendedProps = info.event.extendedProps;
        
        // Handle participant count events
        if (extendedProps.type === 'participant-count') {
          // Add data attributes for CSS targeting
          element.setAttribute('data-participant-count', 'true');
          element.setAttribute('data-type', selectedType);
          
          // Style as a badge
          element.style.borderRadius = '12px';
          element.style.fontWeight = '600';
          element.style.fontSize = '0.75rem';
          element.style.padding = '4px 8px';
          element.style.margin = '2px';
          element.style.display = 'inline-block';
          element.style.minWidth = '60px';
          element.style.textAlign = 'center';
          element.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          
          // Add hover effect
          element.addEventListener('mouseenter', () => {
            element.style.transform = 'translateY(-1px)';
            element.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          });
          
          element.addEventListener('mouseleave', () => {
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          });
        } else {
          // Legacy styling for individual reservations (if any remain)
          const reservation = extendedProps.reservation;
          
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
            console.log('Reservation Calendar - Date clicked:', dateStr);
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
  $: if (reservations || selectedType || stats) {
    setTimeout(initializeCalendar, 0);
  }

  // Group reservations by date and count participants
  const groupReservationsByDate = (reservations: any[]) => {
    const grouped: Record<string, any[]> = {};
    
    reservations.forEach(reservation => {
      const dateStr = reservation.res_date.split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(reservation);
    });
    
    return grouped;
  };

  // Count participants for a given reservation (instructor + students)
  const countParticipants = (reservation: any) => {
    // For Course/Coaching, count 1 instructor + number of students
    // For other types, count 1 instructor + number of students (if any)
    const studentCount = reservation.student_count || 0;
    const totalCount = 1 + studentCount;
    
    // Debug logging for Course/Coaching reservations
    if (reservation.pool_type === 'course_coaching' || 
        reservation.classroom_type === 'course_coaching' || 
        reservation.open_water_type === 'course_coaching') {
      console.log(`Course/Coaching reservation: ${reservation.res_type}, student_count: ${studentCount}, total: ${totalCount}`);
    }
    
    // Always count 1 instructor + students
    // This applies to Course/Coaching and any other reservation type that has students
    return totalCount;
  };

  // Get time period from reservation
  const getTimePeriod = (reservation: any) => {
    const d = new Date(reservation.res_date);
    const hour = d.getHours();
    return hour < 12 ? 'AM' : 'PM';
  };

  // Convert grouped reservations or stats to calendar events
  const createParticipantCountEvents = (groupedReservations: Record<string, any[]>) => {
    const events: any[] = [];
    
    // If we have stats, use them directly
    if (stats && stats.length > 0) {
      console.log('Creating events from stats:', stats);
      
      // Group stats by date
      const statsByDate: Record<string, any[]> = {};
      stats.forEach(stat => {
        const dateStr = stat.res_date; // RPC returns date string
        if (!statsByDate[dateStr]) statsByDate[dateStr] = [];
        statsByDate[dateStr].push(stat);
      });

      Object.entries(statsByDate).forEach(([dateStr, dayStats]) => {
        if (selectedType === ReservationType.openwater) {
          // Filter stats for Open Water
          const owStats = dayStats.filter(s => s.res_type === 'open_water');
          
          const amStat = owStats.find(s => s.time_period === 'AM');
          const pmStat = owStats.find(s => s.time_period === 'PM');
          
          if (amStat && amStat.participant_count > 0) {
             events.push({
              id: `am-${dateStr}`,
              title: `AM ${amStat.participant_count}`,
              start: `${dateStr}T08:00:00`,
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              textColor: '#ffffff',
              extendedProps: {
                type: 'participant-count',
                timePeriod: 'AM',
                count: amStat.participant_count
              }
            });
          }
          
          if (pmStat && pmStat.participant_count > 0) {
             events.push({
              id: `pm-${dateStr}`,
              title: `PM ${pmStat.participant_count}`,
              start: `${dateStr}T14:00:00`,
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              textColor: '#ffffff',
              extendedProps: {
                type: 'participant-count',
                timePeriod: 'PM',
                count: pmStat.participant_count
              }
            });
          }
        } else {
          // Pool or Classroom
          const typeStats = dayStats.find(s => 
            (selectedType === ReservationType.pool && s.res_type === 'pool') ||
            (selectedType === ReservationType.classroom && s.res_type === 'classroom')
          );
          
          if (typeStats && typeStats.participant_count > 0) {
            const backgroundColor = selectedType === ReservationType.classroom ? '#ef4444' : '#3b82f6';
            const borderColor = selectedType === ReservationType.classroom ? '#ef4444' : '#3b82f6';
            
            events.push({
              id: `day-${dateStr}`,
              title: `${typeStats.participant_count}`,
              start: `${dateStr}T12:00:00`,
              backgroundColor: 'transparent', // Handled by CSS
              borderColor: 'transparent',
              textColor: '#ffffff',
              extendedProps: {
                type: 'participant-count',
                timePeriod: 'ALL',
                count: typeStats.participant_count
              }
            });
          }
        }
      });
      
      return events;
    }

    // Fallback to existing logic (calculating from reservations array)
    console.log('Creating participant count events for grouped reservations:', groupedReservations);
    
    Object.entries(groupedReservations).forEach(([dateStr, dayReservations]) => {
      console.log(`Processing date ${dateStr} with ${dayReservations.length} reservations`);
      
      if (selectedType === ReservationType.openwater) {
        // For Open Water, show AM/PM badges
        const amReservations = dayReservations.filter(r => getTimePeriod(r) === 'AM');
        const pmReservations = dayReservations.filter(r => getTimePeriod(r) === 'PM');
        
        // Create AM event if there are AM reservations
        if (amReservations.length > 0) {
          const amParticipantCount = amReservations.reduce((sum, r) => sum + countParticipants(r), 0);
          console.log(`Creating AM event for ${dateStr} with ${amParticipantCount} participants`);
          
          events.push({
            id: `am-${dateStr}`,
            title: `AM +${amParticipantCount}`,
            start: `${dateStr}T08:00:00`,
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            textColor: '#ffffff',
            extendedProps: {
              type: 'participant-count',
              timePeriod: 'AM',
              count: amParticipantCount,
              reservations: amReservations
            }
          });
        }
        
        // Create PM event if there are PM reservations
        if (pmReservations.length > 0) {
          const pmParticipantCount = pmReservations.reduce((sum, r) => sum + countParticipants(r), 0);
          console.log(`Creating PM event for ${dateStr} with ${pmParticipantCount} participants`);
          
          events.push({
            id: `pm-${dateStr}`,
            title: `PM +${pmParticipantCount}`,
            start: `${dateStr}T14:00:00`,
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            textColor: '#ffffff',
            extendedProps: {
              type: 'participant-count',
              timePeriod: 'PM',
              count: pmParticipantCount,
              reservations: pmReservations
            }
          });
        }
      } else {
        // For Pool and Classroom, show single daily count
        const totalParticipantCount = dayReservations.reduce((sum, r) => sum + countParticipants(r), 0);
        if (totalParticipantCount > 0) {
          console.log(`Creating daily event for ${dateStr} with ${totalParticipantCount} participants`);
          
          // Use different colors based on reservation type
          const backgroundColor = selectedType === ReservationType.classroom ? '#ef4444' : '#3b82f6';
          const borderColor = selectedType === ReservationType.classroom ? '#ef4444' : '#3b82f6';
          
          events.push({
            id: `day-${dateStr}`,
            title: `+${totalParticipantCount}`,
            start: `${dateStr}T12:00:00`,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            textColor: '#ffffff',
            extendedProps: {
              type: 'participant-count',
              timePeriod: 'ALL',
              count: totalParticipantCount,
              reservations: dayReservations
            }
          });
        }
      }
    });
    
    console.log('Final events created:', events);
    return events;
  };

  // Convert reservation to calendar event (legacy - now unused)
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
    const userName = reservation.user_profiles?.nickname || reservation.user_profiles?.name || 'You';

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
      case ReservationType.pool:
        return 'Pool Calendar';
      case ReservationType.openwater:
        return 'Open Water Calendar';
      case ReservationType.classroom:
        return 'Classroom Calendar';
      default:
        return 'Open Water Calendar';
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
  <div id="reservation-calendar" bind:this={calendarEl}></div>
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

  /* Participant count badge styling */
  :global(.fc .fc-daygrid-event[data-participant-count="true"]) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    margin: 2px !important;
    padding: 0 !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    min-width: auto !important;
  }

  :global(.fc .fc-daygrid-event[data-participant-count="true"] .fc-event-title) {
    background: #3b82f6;
    color: white !important;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem !important;
    font-weight: 700 !important;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }

  /* Open Water specific styling */
  :global(.fc .fc-daygrid-event[data-participant-count="true"][data-type="openwater"]) {
    width: 100%;
    justify-content: flex-start !important;
    padding-left: 4px !important;
  }

  :global(.fc .fc-daygrid-event[data-participant-count="true"][data-type="openwater"] .fc-event-title) {
    background: #10b981;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
    width: auto;
    height: auto;
    border-radius: 12px;
    padding: 2px 8px;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
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