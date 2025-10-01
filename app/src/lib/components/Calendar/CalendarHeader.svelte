<script lang="ts">
  export let title: string;
  export let onBack: () => void;
</script>

<div class="single-day-header">
  <button class="back-button" on:click={onBack}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
    </svg>
    Back to Calendar
  </button>
  <h1 class="single-day-title">{title}</h1>
  
</div>


