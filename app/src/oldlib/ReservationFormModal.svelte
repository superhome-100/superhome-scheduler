<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore } from './auth';
  import { supabase } from './supabase';
  import LoadingSpinner from './LoadingSpinner.svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;

  // Form data
  let formData = {
    date: '',
    type: 'pool',
    timeOfDay: 'AM',
    startTime: '',
    endTime: '',
    notes: '',
    depth: '',
    autoPair: false
  };

  // Form validation and loading state
  let errors: Record<string, string> = {};
  let loading = false;
  let submitError: string | null = null;

  const reservationTypes = [
    { value: 'pool', label: 'Pool' },
    { value: 'openwater', label: 'Open Water' },
    { value: 'classroom', label: 'Classroom' }
  ];


  const timeOfDayOptions = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' }
  ];

  const closeModal = () => {
    dispatch('close');
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const validateForm = () => {
    errors = {} as Record<string, string>;
    
    if (!formData.date) errors.date = 'Date is required';
    
    // Time validation only for Pool and Classroom
    if (formData.type !== 'openwater') {
      if (!formData.startTime) errors.startTime = 'Start time is required';
      if (!formData.endTime) errors.endTime = 'End time is required';
    }
    
    // Open Water validations
    if (formData.type === 'openwater') {
      if (!formData.timeOfDay) {
        errors.timeOfDay = 'Time of day is required for Open Water';
      }
      const depthNum = parseInt(formData.depth as unknown as string, 10);
      if (!formData.depth || isNaN(depthNum) || depthNum <= 0) {
        errors.depth = 'Depth (m) must be a positive number';
      }
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    if (!$authStore.user) {
      submitError = 'You must be logged in to make a reservation';
      return;
    }

    try {
      loading = true;
      submitError = null;

      // Set default times for Open Water reservations
      const submissionData = { ...formData };
      if (submissionData.type === 'openwater') {
        if (formData.timeOfDay === 'AM') {
          submissionData.startTime = '08:00';
          submissionData.endTime = '12:00';
        } else {
          submissionData.startTime = '13:00';
          submissionData.endTime = '17:00';
        }
      }

      // Create reservation date-time
      const reservationDateTime = new Date(`${submissionData.date}T${submissionData.startTime}`);
      
      // Check if date is in the future
      if (reservationDateTime <= new Date()) {
        submitError = 'Reservation date must be in the future';
        return;
      }

      // Map form type to database enum
      const resTypeMap: Record<string, string> = {
        'pool': 'pool',
        'openwater': 'open_water',
        'classroom': 'classroom'
      };

      // Insert parent reservation (minimal columns)
      const res_type = resTypeMap[submissionData.type] || 'pool';
      const res_date_iso = reservationDateTime.toISOString();
      const { error: parentErr } = await supabase
        .from('reservations')
        .insert({
          uid: $authStore.user.id,
          res_date: res_date_iso,
          res_type,
          res_status: 'pending'
        });
      if (parentErr) throw parentErr;

      // Insert into detail table based on type
      let childErr: any = null;
      if (submissionData.type === 'pool') {
        const { error } = await supabase
          .from('res_pool')
          .upsert({
            uid: $authStore.user.id,
            res_date: res_date_iso,
            start_time: submissionData.startTime,
            end_time: submissionData.endTime,
            note: submissionData.notes.trim() || null
          });
        childErr = error;
      } else if (submissionData.type === 'classroom') {
        const { error } = await supabase
          .from('res_classroom')
          .upsert({
            uid: $authStore.user.id,
            res_date: res_date_iso,
            start_time: submissionData.startTime,
            end_time: submissionData.endTime,
            note: submissionData.notes.trim() || null
          });
        childErr = error;
      } else if (submissionData.type === 'openwater') {
        const { error } = await supabase
          .from('res_openwater')
          .upsert({
            uid: $authStore.user.id,
            res_date: res_date_iso,
            time_period: submissionData.timeOfDay,
            depth_m: parseInt(formData.depth as unknown as string, 10),
            auto_adjust_closest: !!formData.autoPair,
            note: submissionData.notes.trim() || null
          });
        childErr = error;
      }

      if (childErr) {
        // Best-effort rollback parent insert
        await supabase
          .from('reservations')
          .delete()
          .eq('uid', $authStore.user.id)
          .eq('res_date', res_date_iso);
        throw childErr;
      }

      // Dispatch success event
      dispatch('submit', submissionData);
      resetForm();
      closeModal();
      
    } catch (err) {
      console.error('Error creating reservation:', err);
      submitError = err instanceof Error ? err.message : 'Failed to create reservation';
    } finally {
      loading = false;
    }
  };

  const resetForm = () => {
    formData = {
      date: '',
      type: 'pool',
      timeOfDay: 'AM',
      startTime: '',
      endTime: '',
      notes: '',
      depth: '',
      autoPair: false
    };
    errors = {};
    submitError = null;
    loading = false;
  };

  // Handle type change to reset time fields for Open Water
  const handleTypeChange = () => {
    if (formData.type === 'openwater') {
      // Clear time fields for Open Water
      formData.startTime = '';
      formData.endTime = '';
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div 
    class="modal-overlay" 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Reservation Request"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Reservation Request</h2>
        <button 
          class="modal-close" 
          on:click={closeModal}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <form on:submit={handleSubmit} class="modal-body">
        {#if submitError}
          <div class="error-alert">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {submitError}
          </div>
        {/if}
        <div class="form-grid">
          <!-- Date -->
          <div class="form-group">
            <label for="date" class="form-label">Date *</label>
            <input
              id="date"
              type="date"
              class="form-control"
              class:error={errors.date}
              bind:value={formData.date}
              required
            />
            {#if errors.date}
              <span class="error-message">{errors.date}</span>
            {/if}
          </div>

          <!-- Reservation Type -->
          <div class="form-group">
            <label for="type" class="form-label">Reservation Type *</label>
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


          <!-- Time of Day (Only for Open Water) -->
          {#if formData.type === 'openwater'}
            <div class="form-group">
              <label for="timeOfDay" class="form-label">Time Period (AM/PM) *</label>
              <select
                id="timeOfDay"
                class="form-control"
                class:error={errors.timeOfDay}
                bind:value={formData.timeOfDay}
                required
              >
                {#each timeOfDayOptions as time}
                  <option value={time.value}>{time.label}</option>
                {/each}
              </select>
              {#if errors.timeOfDay}
                <span class="error-message">{errors.timeOfDay}</span>
              {/if}
            </div>

            <!-- Depth (meters) -->
            <div class="form-group">
              <label for="depth" class="form-label">Depth (meters) *</label>
              <input
                id="depth"
                type="number"
                min="1"
                inputmode="numeric"
                pattern="[0-9]*"
                class="form-control"
                class:error={errors.depth}
                bind:value={formData.depth}
                required
              />
              {#if errors.depth}
                <span class="error-message">{errors.depth}</span>
              {/if}
            </div>

            <!-- Auto-pairing -->
            <div class="form-group">
              <label class="form-label">Auto Pairing</label>
              <div class="checkbox-container">
                <input id="autoPair" type="checkbox" bind:checked={formData.autoPair} />
                <label for="autoPair" class="checkbox-label">Auto pair by nearest depth if no exact match</label>
              </div>
            </div>
          {/if}

          <!-- Start Time (Only for Pool and Classroom) -->
          {#if formData.type !== 'openwater'}
            <div class="form-group">
              <label for="startTime" class="form-label">Start Time *</label>
              <input
                id="startTime"
                type="time"
                class="form-control"
                class:error={errors.startTime}
                bind:value={formData.startTime}
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
                required
              />
              {#if errors.endTime}
                <span class="error-message">{errors.endTime}</span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="notes" class="form-label">Notes (Optional)</label>
          <textarea
            id="notes"
            class="form-control"
            rows="3"
            placeholder="Add any additional notes or special requirements..."
            bind:value={formData.notes}
          ></textarea>
        </div>

        <div class="modal-actions">
          <button 
            type="button" 
            class="btn btn-secondary" 
            on:click={closeModal}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
            disabled={loading}
          >
            {#if loading}
              <LoadingSpinner size="sm" />
              Submitting...
            {:else}
              Submit Reservation
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
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
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
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
    color: #1e293b;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .modal-body {
    padding: 1.5rem;
    flex: 1;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

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
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .error-alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    border: 1px solid #fecaca;
  }

  .checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .checkbox-container input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .checkbox-label {
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    line-height: 1.4;
    user-select: text;
  }

  .checkbox-label:hover {
    color: #1f2937;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-content {
      max-height: 95vh;
    }

    .form-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .modal-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
