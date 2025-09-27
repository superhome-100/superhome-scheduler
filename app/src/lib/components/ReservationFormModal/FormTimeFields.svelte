<script lang="ts">
  export let formData: any;
  export let errors: Record<string, string> = {};
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
