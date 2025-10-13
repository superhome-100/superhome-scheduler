<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { now, isToday } from '../../utils/dateUtils';

  export let formData: any;
  export let errors: Record<string, string> = {};

  const dispatch = createEventDispatcher();

  // Get current time in HH:MM format for min attribute when date is today
  $: currentTime = now().format('HH:mm');
  $: isDateToday = formData.date ? isToday(formData.date) : false;
  $: minTime = isDateToday ? currentTime : undefined;

  const handleTimeChange = (field: 'startTime' | 'endTime') => {
    // Clear any existing time errors when user changes time
    if (errors[field] && errors[field].includes('must be in the future')) {
      delete errors[field];
    }
    
    // Validate time in real-time when date is today
    if (formData.date && formData[field] && isToday(formData.date)) {
      const currentTimeObj = now();
      const selectedTime = now(`${formData.date}T${formData[field]}`);
      
      if (selectedTime.isBefore(currentTimeObj)) {
        errors[field] = `${field === 'startTime' ? 'Start' : 'End'} time must be in the future`;
      }
    }
    
    // Validate time order if both times are set
    if (formData.startTime && formData.endTime && formData.startTime && formData.endTime) {
      const startTime = now(`${formData.date}T${formData.startTime}`);
      const endTime = now(`${formData.date}T${formData.endTime}`);
      
      if (startTime.isAfter(endTime)) {
        errors.endTime = 'End time must be after start time';
      } else if (errors.endTime && errors.endTime.includes('must be after start time')) {
        delete errors.endTime;
      }
    }
    
    // Trigger validation update
    dispatch('validationChange', { errors });
  };
</script>

<!-- Start Time (Only for Pool and Classroom) -->
<div class="form-group">
  <label for="startTime" class="form-label">Start Time *</label>
  <input
    id="startTime"
    type="time"
    class="form-control"
    class:error={errors.startTime}
    bind:value={formData.startTime}
    on:change={() => handleTimeChange('startTime')}
    min={minTime}
    required
  />
  {#if errors.startTime}
    <span class="error-message">{errors.startTime}</span>
  {/if}
</div>

<!-- End Time (Only for Pool and Classroom) -->
<div class="form-group">
  <label for="endTime" class="form-label">End Time *</label>
  <input
    id="endTime"
    type="time"
    class="form-control"
    class:error={errors.endTime}
    bind:value={formData.endTime}
    on:change={() => handleTimeChange('endTime')}
    min={minTime}
    required
  />
  {#if errors.endTime}
    <span class="error-message">{errors.endTime}</span>
  {/if}
</div>

<style>
  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-control {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
    background: white;
    transition: border-color 0.2s ease;
  }

  .form-control:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-control.error {
    border-color: #ef4444;
  }

  .form-control.error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .error-message {
    display: block;
    font-size: 0.75rem;
    color: #ef4444;
    margin-top: 0.25rem;
  }
</style>
