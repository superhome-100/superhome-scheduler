<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore } from '../../stores/auth';
  import { reservationStore } from '../../stores/reservationStore';
  import type { CreateReservationData } from '../../api/reservationApi';
  import FormModalHeader from './FormModalHeader.svelte';
  import FormBasicFields from './FormBasicFields.svelte';
  import FormOpenWaterFields from './FormOpenWaterFields.svelte';
  import FormPoolFields from './FormPoolFields.svelte';
  import FormClassroomFields from './FormClassroomFields.svelte';
  import FormTimeFields from './FormTimeFields.svelte';
  import FormNotes from './FormNotes.svelte';
  import FormActions from './FormActions.svelte';
  import FormErrorAlert from './FormErrorAlert.svelte';
  import EquipmentOptions from './EquipmentOptions.svelte';
  import CutoffWarning from '../CutoffWarning.svelte';
  import { validateForm, getDefaultFormData, getSubmissionData, getDefaultDateForType, getDefaultTimesFor } from './formUtils';
  import { isBeforeCutoff } from '../../utils/cutoffRules';
  import { checkBlockForForm } from '../../utils/availabilityClient';
  import type { ReservationType } from '../../services/reservationService';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  // Optional initial type from caller (Reservation page calendar selection)
  export let initialType: 'openwater' | 'pool' | 'classroom' | undefined;

  // Form data
  let formData = getDefaultFormData();

  // Set default pulley value for Course/Coaching
  $: if (formData.openWaterType === 'course_coaching' && formData.pulley === false) {
    formData.pulley = 'true';
  }

  // Trigger validation when form data changes
  $: if (formData.date && formData.type) {
    const { errors: validationErrors } = validateForm(formData);
    errors = validationErrors;
  }

  // Map UI form type to service ReservationType ('open_water' | 'pool' | 'classroom')
  const toServiceReservationType = (t: 'openwater' | 'pool' | 'classroom'): ReservationType => {
    return t === 'openwater' ? 'open_water' : t;
  };

  // Reactive values for CutoffWarning to ensure updates
  $: currentReservationDate = formData.date;
  $: currentResType = formData.type ? toServiceReservationType(formData.type) : 'pool';

  // Check if cutoff time has passed (used for warnings and disabling actions)
  $: isCutoffPassed = (() => {
    if (!formData.date || !formData.type) return false;
    const resType: ReservationType = formData.type ? toServiceReservationType(formData.type) : 'pool';

    // Open Water: evaluate against fixed slot start
    if (formData.type === 'openwater' && formData.timeOfDay) {
      const time = formData.timeOfDay === 'AM' ? '08:00' : '13:00';
      const reservationDateTime = new Date(`${formData.date}T${time}`);
      return !isBeforeCutoff(reservationDateTime.toISOString(), resType);
    }

    // Pool/Classroom: only evaluate cutoff once a startTime is chosen
    if ((formData.type === 'pool' || formData.type === 'classroom')) {
      if (!formData.startTime) return false;
      const reservationDateTime = new Date(`${formData.date}T${formData.startTime}`);
      return !isBeforeCutoff(reservationDateTime.toISOString(), resType);
    }

    return false;
  })();

  // Availability check (READ directly from DB per rules)
  let isBlocked = false;
  let blockedReason: string | null = null;

  async function checkAvailabilityClient() {
    isBlocked = false;
    blockedReason = null;
    if (!formData.date || !formData.type) return;
    const res = await checkBlockForForm(formData);
    isBlocked = res.isBlocked;
    blockedReason = res.reason;
  }

  // Trigger availability check when relevant fields change
  $: if (formData.date && formData.type) {
    checkAvailabilityClient();
  }

  // Also trigger when subtype fields change
  $: if (formData.type === 'pool' && formData.poolType && formData.date) {
    checkAvailabilityClient();
  }
  $: if (formData.type === 'classroom' && formData.classroomType && formData.date) {
    checkAvailabilityClient();
  }
  $: if (formData.type === 'openwater' && formData.openWaterType && formData.date) {
    checkAvailabilityClient();
  }

  // Form validation and loading state
  let errors: Record<string, string> = {};
  let loading = false;
  let submitError: string | null = null;
  let submitAttempted = false;

  const closeModal = () => {
    dispatch('close');
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const validateFormData = () => {
    const { errors: validationErrors, isValid } = validateForm(formData);
    errors = validationErrors;
    return isValid;
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    submitAttempted = true;
    
    if (!validateFormData()) return;
    if (!$authStore.user) {
      submitError = 'You must be logged in to make a reservation';
      return;
    }

    try {
      loading = true;
      submitError = null;

      // Set default times for Open Water reservations
      const submissionData = getSubmissionData(formData);

      // Create reservation date-time
      const reservationDateTime = new Date(`${submissionData.date}T${submissionData.startTime}`);
      
      // Check if date is in the future
      if (reservationDateTime <= new Date()) {
        submitError = 'Reservation date must be in the future';
        return;
      }

      // Map form type to database enum
      // Prepare reservation data for CRUD API
      const reservationData: CreateReservationData = {
        res_type: toServiceReservationType(submissionData.type as 'openwater' | 'pool' | 'classroom'),
        res_date: reservationDateTime.toISOString(),
        res_status: 'pending'
      };

      // Add type-specific details
      if (submissionData.type === 'pool') {
        reservationData.pool = {
          start_time: submissionData.startTime,
          end_time: submissionData.endTime,
          note: submissionData.notes.trim() || undefined,
          pool_type: formData.poolType || undefined
        };
      } else if (submissionData.type === 'classroom') {
        reservationData.classroom = {
          start_time: submissionData.startTime,
          end_time: submissionData.endTime,
          note: submissionData.notes.trim() || undefined,
          classroom_type: formData.classroomType || undefined
        };
      } else if (submissionData.type === 'openwater') {
        reservationData.openwater = {
          time_period: submissionData.timeOfDay,
          depth_m: formData.depth ? parseInt(formData.depth as unknown as string, 10) : undefined,
          open_water_type: formData.openWaterType || undefined,
          student_count: formData.openWaterType === 'course_coaching' ? 
            parseInt(formData.studentCount as unknown as string, 10) : undefined,
          // Equipment fields for Open Water types (Autonomous and Course/Coaching)
          pulley: formData.openWaterType === 'course_coaching' ? 
            (formData.pulley === 'true' || formData.pulley === true) : !!formData.pulley,
          deep_fim_training: !!formData.deepFimTraining,
          bottom_plate: !!formData.bottomPlate,
          large_buoy: !!formData.largeBuoy,
          note: submissionData.notes.trim() || undefined
        };
      }

      // Use CRUD system to create reservation
      const result = await reservationStore.createReservation($authStore.user.id, reservationData);
      
      if (result.success) {
        // Dispatch success event with the created reservation data
        dispatch('submit', {
          ...submissionData,
          reservation: result.data
        });
        resetForm();
        closeModal();
      } else {
        submitError = result.error || 'Failed to create reservation';
      }
      
    } catch (err) {
      console.error('Error creating reservation:', err);
      submitError = err instanceof Error ? err.message : 'Failed to create reservation';
    } finally {
      loading = false;
    }
  };

  const resetForm = () => {
    formData = getDefaultFormData();
    errors = {};
    submitError = null;
    loading = false;
    submitAttempted = false;
  };

  // Handle type change to reset time fields for Open Water
  const handleTypeChange = () => {
    if (formData.type === 'openwater') {
      // Clear time fields for Open Water
      formData.startTime = '';
      formData.endTime = '';
    } else if (formData.type === 'pool') {
      // Pool defaults with 30-min logic
      formData.poolType = 'autonomous';
      const t = getDefaultTimesFor('pool');
      formData.startTime = t.startTime;
      formData.endTime = t.endTime;
    } else if (formData.type === 'classroom') {
      // Classroom defaults with 30-min logic
      const t = getDefaultTimesFor('classroom');
      formData.startTime = t.startTime;
      formData.endTime = t.endTime;
    }
    // Recompute default date based on type and current time cutoff
    const mappedType: 'openwater' | 'pool' | 'classroom' = (formData.type as any) || 'pool';
    formData.date = getDefaultDateForType(mappedType);
  };

  // Apply initialType when modal opens (Reservation page)
  let wasOpen = false;
  $: if (isOpen && !wasOpen) {
    wasOpen = true;
    if (initialType && formData.type !== initialType) {
      formData.type = initialType;
      // Apply defaults for the selected type (times, date)
      handleTypeChange();
    }
  }
  $: if (!isOpen && wasOpen) {
    wasOpen = false;
  }

  // Handle validation changes from child components
  const handleValidationChange = (event: CustomEvent) => {
    // If no specific errors are provided, trigger full form validation
    if (event.detail.errors && Object.keys(event.detail.errors).length === 0) {
      const { errors: validationErrors } = validateForm(formData);
      errors = validationErrors;
    } else {
      // Merge specific errors from child components
      errors = { ...errors, ...event.detail.errors };
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
      <FormModalHeader on:close={closeModal} />

      <form on:submit={handleSubmit} class="modal-body">
        <FormErrorAlert {submitError} />
        {#if isBlocked}
          <div class="alert alert-error mb-3 text-sm">
            <span class="font-bold text-red-600">
              This date is currently blocked for {formData.type}.
            </span>
            {#if blockedReason}
              <span class="ml-2 text-red-600">Reason: {blockedReason}</span>
            {/if}
          </div>
        {/if}
        
        <!-- Cut-off Warning -->
        {#if currentReservationDate && currentResType}
          <CutoffWarning 
            reservationDate={currentReservationDate}
            resType={currentResType}
            startTime={formData.startTime}
          />
        {/if}
        
        <div class="form-grid">
          <!-- Basic Fields: Date and Type -->
          <FormBasicFields 
            bind:formData 
            {errors} 
            on:typeChange={handleTypeChange}
            on:validationChange={handleValidationChange}
          />

          {#if formData.type === 'pool'}
            <FormPoolFields 
              bind:formData
              {errors}
              on:validationChange={handleValidationChange}
            />
          {/if}

          <!-- Open Water specific fields -->
          {#if formData.type === 'openwater'}
            <FormOpenWaterFields 
              bind:formData 
              {errors}
              {submitAttempted}
              on:validationChange={handleValidationChange}
            />
          {/if}

          {#if formData.type === 'classroom'}
            <FormClassroomFields 
              bind:formData
              {errors}
              on:validationChange={handleValidationChange}
            />
          {/if}

          <!-- Time fields for Pool and Classroom -->
          {#if formData.type !== 'openwater'}
            <div class="time-fields-wrapper">
              <FormTimeFields 
                bind:formData 
                {errors} 
                on:validationChange={handleValidationChange}
              />
            </div>
          {/if}
        </div>

        <!-- Equipment Options -->
        <EquipmentOptions bind:formData />

        <!-- Notes -->
        <FormNotes bind:formData />

        <!-- Actions -->
        <FormActions {loading} isCutoffPassed={(isCutoffPassed || isBlocked)} on:close={closeModal} />
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

  .time-fields-wrapper {
    grid-column: 1 / -1;
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

    .time-fields-wrapper {
      grid-column: 1;
    }
  }
</style>
