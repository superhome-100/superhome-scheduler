<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore } from '../../stores/auth';
  import { supabase } from '../../utils/supabase';
  import FormModalHeader from './FormModalHeader.svelte';
  import FormBasicFields from './FormBasicFields.svelte';
  import FormOpenWaterFields from './FormOpenWaterFields.svelte';
  import FormTimeFields from './FormTimeFields.svelte';
  import FormNotes from './FormNotes.svelte';
  import FormActions from './FormActions.svelte';
  import FormErrorAlert from './FormErrorAlert.svelte';
  import { validateForm, getDefaultFormData, getSubmissionData } from './formUtils';

  const dispatch = createEventDispatcher();

  export let isOpen = false;

  // Form data
  let formData = getDefaultFormData();

  // Form validation and loading state
  let errors: Record<string, string> = {};
  let loading = false;
  let submitError: string | null = null;

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
            depth_m: formData.depth ? parseInt(formData.depth as unknown as string, 10) : null,
            open_water_type: formData.openWaterType,
            student_count: formData.openWaterType === 'course_coaching' ? parseInt(formData.studentCount as unknown as string, 10) : null,
            // Equipment fields for Autonomous types
            pulley: !!formData.pulley,
            deep_fim_training: !!formData.deepFimTraining,
            bottom_plate: !!formData.bottomPlate,
            large_buoy: !!formData.largeBuoy,
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
    formData = getDefaultFormData();
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
      <FormModalHeader on:close={closeModal} />

      <form on:submit={handleSubmit} class="modal-body">
        <FormErrorAlert {submitError} />
        
        <div class="form-grid">
          <!-- Basic Fields: Date and Type -->
          <FormBasicFields 
            bind:formData 
            {errors} 
            on:typeChange={handleTypeChange}
          />

          <!-- Open Water specific fields -->
          {#if formData.type === 'openwater'}
            <FormOpenWaterFields bind:formData {errors} />
          {/if}

          <!-- Time fields for Pool and Classroom -->
          {#if formData.type !== 'openwater'}
            <FormTimeFields bind:formData {errors} />
          {/if}
        </div>

        <!-- Notes -->
        <FormNotes bind:formData />

        <!-- Actions -->
        <FormActions {loading} on:close={closeModal} />
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
  }
</style>
