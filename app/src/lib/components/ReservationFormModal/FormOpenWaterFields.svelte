<script lang="ts">
  export let formData: any;
  export let errors: Record<string, string> = {};
  import { timeOfDayOptions } from './formConstants';
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
  <div class="checkbox-container">
    <input id="autoPair" type="checkbox" bind:checked={formData.autoPair} />
    <label for="autoPair" class="checkbox-label">Auto pair by nearest depth if no exact match</label>
  </div>
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
</style>
