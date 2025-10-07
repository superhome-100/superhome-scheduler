<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const handleNewReservation = () => {
    dispatch('newReservation');
  };
</script>

<!-- Floating Action Button: New Reservation -->
<div class="fab-container" aria-hidden="false">
  <button 
    class="fab-btn" 
    on:click={handleNewReservation}
    aria-label="Add new reservation"
    title="Add new reservation"
  >
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
    <span class="fab-text"> New Reservation</span>
  </button>
</div>

<style>
  .fab-container {
    position: fixed;
    right: 1.25rem;
    bottom: 1.25rem; /* equal gap on small screens, pushed farther from corner */
    z-index: 100; /* above content but below modals */
    pointer-events: none; /* allow only the button to capture */
  }

  .fab-btn {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #3b82f6;
    color: hsl(var(--bc));
    border: none;
    width: 56px;
    height: 56px;
    border-radius: 50%; /* round on small screens */
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
  }

  .fab-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(59, 130, 246, 0.45);
    background: #2563eb;
  }

  .fab-btn:active {
    transform: translateY(0);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
  }

  .fab-btn:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35), 0 8px 20px rgba(59, 130, 246, 0.35);
  }

  .fab-text {
    display: none; /* icon-only by default on small screens */
  }

  @media (min-width: 768px) {
    .fab-container { right: 2rem; bottom: 2rem; } /* equal gap on desktop, farther from corner */
    .fab-btn { 
      padding: 0.9rem 1.1rem; 
      width: auto; 
      height: auto; 
      border-radius: 9999px; /* pill on larger screens */
      gap: 0.5rem;
    }
    .fab-text { display: inline; font-weight: 600; font-size: 0.95rem; }
  }
</style>
