<script lang="ts">
  export let formData: any;
  export let errors: Record<string, string> = {};
  import { timeOfDayOptions, openWaterTypes } from './formConstants';
  
  // Get depth constraints based on Open Water type
  $: depthConstraints = (() => {
    switch (formData.openWaterType) {
      case 'course_coaching':
        return { min: 0, max: 130 };
      case 'autonomous_buoy':
        return { min: 15, max: 89 };
      case 'autonomous_platform':
        return { min: 15, max: 99 };
      case 'autonomous_platform_cbs':
        return { min: 90, max: 130 };
      default:
        return { min: 1, max: 200 };
    }
  })();
</script>

<!-- Time of Day (Only for Open Water) -->
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
{#if formData.openWaterType === 'course_coaching'}
  <div class="form-group">
    <label for="studentCount" class="form-label">No. of Students *</label>
    <select
      id="studentCount"
      class="form-control"
      class:error={errors.studentCount}
      bind:value={formData.studentCount}
      required
    >
      <option value="">Select number of students</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
    {#if errors.studentCount}
      <span class="error-message">{errors.studentCount}</span>
    {/if}
  </div>
{/if}

<!-- Depth (meters) - For all Open Water types -->
{#if formData.openWaterType}
  <div class="form-group">
    <label for="depth" class="form-label">
      Depth (meters)
      {#if formData.openWaterType !== 'course_coaching'}
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
      class:error={errors.depth}
      bind:value={formData.depth}
      required={formData.openWaterType !== 'course_coaching'}
    />
    {#if errors.depth}
      <span class="error-message">{errors.depth}</span>
    {/if}
  </div>
{/if}

<!-- Equipment Options (Only for Autonomous types) -->
{#if formData.openWaterType && formData.openWaterType.startsWith('autonomous')}
  <div class="form-group">
    <div class="form-label">Equipment Options</div>
    <div class="equipment-options">
      <div class="checkbox-container">
        <input id="pulley" type="checkbox" bind:checked={formData.pulley} />
        <label for="pulley" class="checkbox-label">Pulley</label>
      </div>
      <div class="checkbox-container">
        <input id="deepFimTraining" type="checkbox" bind:checked={formData.deepFimTraining} />
        <label for="deepFimTraining" class="checkbox-label">Deep FIM Training</label>
      </div>
      <div class="checkbox-container">
        <input id="bottomPlate" type="checkbox" bind:checked={formData.bottomPlate} />
        <label for="bottomPlate" class="checkbox-label">Bottom Plate</label>
      </div>
      <div class="checkbox-container">
        <input id="largeBuoy" type="checkbox" bind:checked={formData.largeBuoy} />
        <label for="largeBuoy" class="checkbox-label">Large Buoy</label>
      </div>
    </div>
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

  .equipment-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .equipment-options .checkbox-container {
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    transition: all 0.2s ease;
  }

  .equipment-options .checkbox-container:hover {
    border-color: #d1d5db;
    background: #f3f4f6;
  }

  .equipment-options input[type="checkbox"]:checked + .checkbox-label {
    color: #1f2937;
    font-weight: 500;
  }

  .equipment-options .checkbox-container:has(input[type="checkbox"]:checked) {
    background: #dbeafe;
    border-color: #3b82f6;
  }
</style>
