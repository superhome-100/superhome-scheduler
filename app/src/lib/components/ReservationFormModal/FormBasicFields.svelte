<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { reservationTypes } from './formConstants';
  import { now, isPast } from '../../utils/dateUtils';

  export let formData: any;
  export let errors: Record<string, string> = {};

  const dispatch = createEventDispatcher();

  // Get current date in YYYY-MM-DD format for min attribute
  const currentDate = now().format('YYYY-MM-DD');

  const handleTypeChange = () => {
    if (formData.type === 'openwater') {
      // Clear time fields for Open Water
      formData.startTime = '';
      formData.endTime = '';
    }
    dispatch('typeChange');
  };

  const handleDateChange = () => {
    // Clear any existing date error when user changes date
    if (errors.date) {
      delete errors.date;
    }
    
    // Validate date in real-time
    if (formData.date && isPast(formData.date)) {
      errors.date = 'Reservation date must be today or in the future';
    }
    
    // Trigger full form validation to include cutoff rules
    dispatch('validationChange', { errors });
  };
</script>

<!-- Date -->
<div class="form-group">
  <label for="date" class="form-label">Date *</label>
  <input
    id="date"
    type="date"
    class="form-control"
    class:error={errors.date}
    bind:value={formData.date}
    on:change={handleDateChange}
    min={currentDate}
    required
  />
  {#if errors.date}
    <span class="error-message">{errors.date}</span>
  {/if}
</div>

<!-- Reservation Type -->
<div class="form-group">
  <label for="type" class="form-label">Category Type *</label>
  <select
    id="type"
    class="form-control"
    class:error={errors.type}
    bind:value={formData.type}
    on:change={handleTypeChange}
    required
  >
    {#each reservationTypes as type}
      <option value={type.value}>{type.label}</option>
    {/each}
  </select>
  {#if errors.type}
    <span class="error-message">{errors.type}</span>
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
