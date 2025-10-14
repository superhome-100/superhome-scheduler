<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { now, isToday, isValidTimeFormat, normalize24HourTime } from '../../utils/dateUtils';

  export let formData: any;
  export let errors: Record<string, string> = {};

  const dispatch = createEventDispatcher();

  // Get current time in HH:MM format for min attribute when date is today
  $: currentTime = now().format('HH:mm');
  $: isDateToday = formData.date ? isToday(formData.date) : false;
  $: minTime = isDateToday ? currentTime : undefined;
  // Use utility functions from dateUtils

  // Generate 30-minute intervals for time dropdowns
  const generateTimeIntervals = (startHour: number, endHour: number, includeEndHour30: boolean = false): string[] => {
    const intervals: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // For the end hour, only include 30-minute slot if includeEndHour30 is true
        if (hour === endHour && minute > 0 && !includeEndHour30) break;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        intervals.push(timeString);
      }
    }
    return intervals;
  };

  // Available time slots
  const startTimeSlots = generateTimeIntervals(8, 19, true); // 8:00 to 19:30
  const endTimeSlots = generateTimeIntervals(8, 20); // 8:30 to 20:00

  // Calculate end time automatically when start time changes
  const calculateEndTime = (startTime: string): string => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    let endHours = hours;
    let endMinutes = minutes + 30;
    
    if (endMinutes >= 60) {
      endHours += 1;
      endMinutes = 0;
    }
    
    // Ensure end time doesn't exceed 20:00
    if (endHours > 20 || (endHours === 20 && endMinutes > 0)) {
      return '20:00';
    }
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Filter end time slots based on start time
  $: filteredEndTimeSlots = formData.startTime 
    ? endTimeSlots.filter(time => time > formData.startTime)
    : endTimeSlots;

  // Dropdown state management
  let startTimeDropdownOpen = false;
  let endTimeDropdownOpen = false;

  const toggleDropdown = (field: 'startTime' | 'endTime') => {
    if (field === 'startTime') {
      startTimeDropdownOpen = !startTimeDropdownOpen;
      endTimeDropdownOpen = false; // Close other dropdown
    } else {
      endTimeDropdownOpen = !endTimeDropdownOpen;
      startTimeDropdownOpen = false; // Close other dropdown
    }
  };

  const selectTime = (field: 'startTime' | 'endTime', time: string) => {
    formData[field] = time;
    if (field === 'startTime') {
      startTimeDropdownOpen = false;
    } else {
      endTimeDropdownOpen = false;
    }
    handleTimeChange(field);
  };

  // Close dropdowns when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      startTimeDropdownOpen = false;
      endTimeDropdownOpen = false;
    }
  };

  // Add event listener for clicking outside
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  const handleTimeChange = (field: 'startTime' | 'endTime') => {
    // Clear any existing time errors when user changes time
    if (errors[field] && errors[field].includes('must be in the future')) {
      delete errors[field];
    }
    
    // Auto-calculate end time when start time changes
    if (field === 'startTime' && formData.startTime) {
      const calculatedEndTime = calculateEndTime(formData.startTime);
      formData.endTime = calculatedEndTime;
    }
    
    // Validate time in real-time when date is today
    if (formData.date && formData[field] && isToday(formData.date)) {
      const currentTimeObj = now();
      const normalizedTime = normalize24HourTime(formData[field]);
      const selectedTime = now(`${formData.date}T${normalizedTime}`);
      
      if (selectedTime.isBefore(currentTimeObj)) {
        errors[field] = `${field === 'startTime' ? 'Start' : 'End'} time must be in the future`;
      }
    }
    
    // Validate time order if both times are set
    if (formData.startTime && formData.endTime) {
      const startTimeNormalized = normalize24HourTime(formData.startTime);
      const endTimeNormalized = normalize24HourTime(formData.endTime);
      const startTime = now(`${formData.date}T${startTimeNormalized}`);
      const endTime = now(`${formData.date}T${endTimeNormalized}`);
      
      if (startTime.isAfter(endTime) || startTime.isSame(endTime)) {
        errors.endTime = 'End time must be after start time';
      } else if (errors.endTime && errors.endTime.includes('must be after start time')) {
        delete errors.endTime;
      }
    }
    
    // Trigger validation update
    dispatch('validationChange', { errors });
  };
</script>

<!-- Time Fields (Only for Pool and Classroom) -->
<div class="time-fields-container">
  <!-- Start Time -->
  <div class="form-group time-field">
    <label for="startTime" class="form-label">Start Time *</label>
    <div class="dropdown-container">
      <div 
        class="dropdown-trigger"
        class:error={errors.startTime}
        on:click={() => toggleDropdown('startTime')}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && toggleDropdown('startTime')}
      >
        <span class="dropdown-value">{formData.startTime || 'Select Start Time'}</span>
        <span class="dropdown-arrow" class:open={startTimeDropdownOpen}>▼</span>
      </div>
      
      {#if startTimeDropdownOpen}
        <div class="dropdown-menu">
          {#each startTimeSlots as timeSlot}
            <div 
              class="dropdown-option"
              class:selected={formData.startTime === timeSlot}
              on:click={() => selectTime('startTime', timeSlot)}
              role="option"
              aria-selected={formData.startTime === timeSlot}
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && selectTime('startTime', timeSlot)}
            >
              {timeSlot}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    {#if errors.startTime}
      <span class="error-message">{errors.startTime}</span>
    {/if}
  </div>

  <!-- End Time -->
  <div class="form-group time-field">
    <label for="endTime" class="form-label">End Time *</label>
    <div class="dropdown-container">
      <div 
        class="dropdown-trigger"
        class:error={errors.endTime}
        on:click={() => toggleDropdown('endTime')}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && toggleDropdown('endTime')}
      >
        <span class="dropdown-value">{formData.endTime || 'Select End Time'}</span>
        <span class="dropdown-arrow" class:open={endTimeDropdownOpen}>▼</span>
      </div>
      
      {#if endTimeDropdownOpen}
        <div class="dropdown-menu">
          {#each filteredEndTimeSlots as timeSlot}
            <div 
              class="dropdown-option"
              class:selected={formData.endTime === timeSlot}
              on:click={() => selectTime('endTime', timeSlot)}
              role="option"
              aria-selected={formData.endTime === timeSlot}
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && selectTime('endTime', timeSlot)}
            >
              {timeSlot}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    {#if errors.endTime}
      <span class="error-message">{errors.endTime}</span>
    {/if}
  </div>
</div>

<style>
  .time-fields-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .time-field {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .error-message {
    display: block;
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.25rem;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .time-fields-container {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }

  /* Dropdown container positioning */
  .dropdown-container {
    position: relative;
    width: 100%;
  }

  /* Dropdown trigger styling */
  .dropdown-trigger {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
    background: white;
    transition: border-color 0.2s ease;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 2.5rem;
  }

  .dropdown-trigger:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .dropdown-trigger.error {
    border-color: #ef4444;
  }

  .dropdown-trigger.error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .dropdown-value {
    flex: 1;
    text-align: left;
  }

  .dropdown-arrow {
    transition: transform 0.2s ease;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  /* Dropdown menu positioning - appears below the input */
  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-top: none;
    border-radius: 0 0 6px 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
  }

  /* Dropdown options styling */
  .dropdown-option {
    padding: 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    border-bottom: 1px solid #f3f4f6;
  }

  .dropdown-option:last-child {
    border-bottom: none;
  }

  .dropdown-option:hover {
    background-color: #f3f4f6;
  }

  .dropdown-option.selected {
    background-color: #3b82f6;
    color: white;
  }

  .dropdown-option:focus {
    outline: none;
    background-color: #f3f4f6;
  }

  .dropdown-option.selected:focus {
    background-color: #2563eb;
  }

  /* Ensure proper z-index for dropdowns */
  .form-group {
    position: relative;
    z-index: 1;
  }

  .form-group:last-child {
    z-index: 0;
  }
</style>
