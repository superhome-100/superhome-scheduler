<script lang="ts">
  export let formData: any;
</script>

<!-- Equipment Options Section -->
{#if formData.openWaterType && ((formData.openWaterType.startsWith('autonomous') && formData.openWaterType !== 'autonomous_platform' && formData.openWaterType !== 'autonomous_platform_cbs') || formData.openWaterType === 'course_coaching')}
  <div class="equipment-section">
    <h3 class="section-title">Equipment Options</h3>
    <div class="equipment-grid">
      <!-- Pulley Options - Radio buttons for Course/Coaching, Checkbox for Autonomous -->
      {#if formData.openWaterType === 'course_coaching'}
        <div class="equipment-item radio-group">
          <div class="radio-container">
            <input id="pulleyYes" type="radio" name="pulley" value="true" bind:group={formData.pulley} />
            <label for="pulleyYes" class="radio-label">Pulley</label>
          </div>
          <div class="radio-container">
            <input id="pulleyNo" type="radio" name="pulley" value="false" bind:group={formData.pulley} />
            <label for="pulleyNo" class="radio-label">No Pulley</label>
          </div>
        </div>
      {:else}
        <div class="equipment-item checkbox-item">
          <input id="pulley" type="checkbox" bind:checked={formData.pulley} />
          <label for="pulley" class="checkbox-label">Pulley</label>
        </div>
      {/if}
      
      <!-- Additional Equipment Options - Only for Course/Coaching -->
      {#if formData.openWaterType === 'course_coaching'}
        <div class="equipment-item checkbox-item">
          <input id="deepFimTraining" type="checkbox" bind:checked={formData.deepFimTraining} />
          <label for="deepFimTraining" class="checkbox-label">Deep FIM Training</label>
        </div>
        <div class="equipment-item checkbox-item">
          <input id="bottomPlate" type="checkbox" bind:checked={formData.bottomPlate} />
          <label for="bottomPlate" class="checkbox-label">Bottom Plate</label>
        </div>
        <div class="equipment-item checkbox-item">
          <input id="largeBuoy" type="checkbox" bind:checked={formData.largeBuoy} />
          <label for="largeBuoy" class="checkbox-label">Large Buoy</label>
        </div>
      {:else}
        <!-- For Autonomous types, show all options as checkboxes -->
        <div class="equipment-item checkbox-item">
          <input id="deepFimTraining" type="checkbox" bind:checked={formData.deepFimTraining} />
          <label for="deepFimTraining" class="checkbox-label">Deep FIM Training</label>
        </div>
        <div class="equipment-item checkbox-item">
          <input id="bottomPlate" type="checkbox" bind:checked={formData.bottomPlate} />
          <label for="bottomPlate" class="checkbox-label">Bottom Plate</label>
        </div>
        <div class="equipment-item checkbox-item">
          <input id="largeBuoy" type="checkbox" bind:checked={formData.largeBuoy} />
          <label for="largeBuoy" class="checkbox-label">Large Buoy</label>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .equipment-section {
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .equipment-item {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
  }

  .equipment-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  .radio-group {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .radio-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .radio-container input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .radio-label {
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    line-height: 1.4;
    user-select: text;
  }

  .radio-label:hover {
    color: #1f2937;
  }

  .checkbox-item {
    gap: 0.75rem;
  }

  .checkbox-item input[type="checkbox"] {
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
    flex: 1;
  }

  .checkbox-label:hover {
    color: #1f2937;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .equipment-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .equipment-item {
      padding: 0.5rem;
    }
  }
</style>
