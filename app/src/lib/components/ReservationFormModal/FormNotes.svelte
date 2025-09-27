<script lang="ts">
  export let formData: any;
</script>

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
    resize: vertical;
  }

  .form-control:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
</style>
