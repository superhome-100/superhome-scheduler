<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { now, isToday } from "../../utils/dateUtils";
  import { timeOfDayOptions, openWaterTypes } from "./formConstants";

  export let formData: any;
  export let errors: Record<string, string> = {};
  export let submitAttempted: boolean = false;

  const dispatch = createEventDispatcher();

  // Get depth constraints based on Open Water type
  $: depthConstraints = (() => {
    switch (formData.openWaterType) {
      case "course_coaching":
        return { min: 15, max: 130 };
      case "autonomous_buoy":
        return { min: 15, max: 89 };
      case "autonomous_platform":
        return { min: 15, max: 99 };
      case "autonomous_platform_cbs":
        return { min: 90, max: 130 };
      default:
        return { min: 1, max: 200 };
    }
  })();

  const handleTimeOfDayChange = () => {
    // Clear any existing time of day errors when user changes selection
    if (errors.timeOfDay) {
      delete errors.timeOfDay;
    }

    // Validate time period for today
    if (formData.date && formData.timeOfDay && isToday(formData.date)) {
      const currentTime = now();
      const currentHour = currentTime.hour();

      // Check if selected time period is still available today
      if (formData.timeOfDay === "AM" && currentHour >= 12) {
        errors.timeOfDay = "AM time slot is no longer available for today";
      } else if (formData.timeOfDay === "PM" && currentHour >= 17) {
        errors.timeOfDay = "PM time slot is no longer available for today";
      }
    }

    // Trigger full form validation to include cutoff rules
    dispatch("validationChange", { errors });
  };

  // Depth field UX: only show error after touch or form submit
  let depthTouched = false;
  $: showDepthError = !!errors.depth && (submitAttempted || depthTouched);

  // Student count UX: only show error after touch or form submit
  let studentCountTouched = false;
  $: showStudentCountError =
    !!errors.studentCount && (submitAttempted || studentCountTouched);
</script>

<!-- Time of Day (Only for Open Water) -->
<div class="form-group">
  <label for="timeOfDay" class="form-label">Time Period (AM/PM) *</label>
  <select
    id="timeOfDay"
    class="form-control"
    class:error={errors.timeOfDay}
    bind:value={formData.timeOfDay}
    on:change={handleTimeOfDayChange}
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

<!-- Open Water Type Selection -->
<div class="form-group">
  <label for="openWaterType" class="form-label">Open Water Type *</label>
  <select
    id="openWaterType"
    class="form-control"
    class:error={errors.openWaterType}
    bind:value={formData.openWaterType}
    required
  >
    <option value="">Select Open Water Type</option>
    {#each openWaterTypes as type}
      <option value={type.value}>{type.label}</option>
    {/each}
  </select>
  {#if errors.openWaterType}
    <span class="error-message">{errors.openWaterType}</span>
  {/if}
</div>

<!-- Student Count (Only for Course/Coaching) -->
{#if formData.openWaterType === "course_coaching"}
  <div class="form-group">
    <label for="studentCount" class="form-label">No. of Students *</label>
    <select
      id="studentCount"
      class="form-control"
      class:error={showStudentCountError}
      bind:value={formData.studentCount}
      required
      on:blur={() => (studentCountTouched = true)}
    >
      <option value="">Select number of students</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
    </select>
    {#if showStudentCountError}
      <span class="error-message">{errors.studentCount}</span>
    {/if}
  </div>
{/if}

<!-- Depth (meters) - For all Open Water types -->
{#if formData.openWaterType}
  <div class="form-group">
    <label for="depth" class="form-label">
      Depth (meters)
      {#if formData.openWaterType !== "course_coaching"}
        *
      {/if}
    </label>
    <input
      id="depth"
      type="number"
      min={depthConstraints.min}
      max={depthConstraints.max}
      inputmode="numeric"
      pattern="[0-9]*"
      class="form-control"
      class:error={showDepthError}
      bind:value={formData.depth}
      required={formData.openWaterType !== "course_coaching"}
      on:blur={() => (depthTouched = true)}
    />
    {#if showDepthError}
      <span class="error-message">{errors.depth}</span>
    {/if}
  </div>
{/if}

<!-- Auto-pairing functionality removed -->

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
