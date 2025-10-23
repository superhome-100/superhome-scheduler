<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { classroomTypes } from './formConstants';

  export let formData: any;
  export let errors: Record<string, string> = {};
  export let submitAttempted: boolean = false;

  const dispatch = createEventDispatcher();

  const handleChange = () => {
    dispatch('validationChange', { errors: {} });
  };

  // Student count UX: only show error after touch or form submit
  let studentCountTouched = false;
  $: showStudentCountError = !!errors.studentCount && (submitAttempted || studentCountTouched);
</script>

<!-- Classroom Type -->
<div class="form-group">
  <label for="classroomType" class="form-label">Classroom Type *</label>
  <select
    id="classroomType"
    class="form-control"
    class:error={errors.classroomType}
    bind:value={formData.classroomType}
    on:change={handleChange}
    required
  >
    <option value="" disabled>Select type</option>
    {#each classroomTypes as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
  {#if errors.classroomType}
    <span class="error-message">{errors.classroomType}</span>
  {/if}
</div>

<!-- Student Count (Only for Course/Coaching) -->
{#if formData.classroomType === 'course_coaching'}
  <div class="form-group">
    <label for="classroomStudentCount" class="form-label">No. of Students *</label>
    <select
      id="classroomStudentCount"
      class="form-control"
      class:error={showStudentCountError}
      bind:value={formData.studentCount}
      on:change={handleChange}
      on:blur={() => (studentCountTouched = true)}
      required
    >
      <option value="">Select number of students</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
    {#if showStudentCountError}
      <span class="error-message">{errors.studentCount}</span>
    {/if}
  </div>
{/if}

<style>
  .form-group { margin-bottom: 1rem; }
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
