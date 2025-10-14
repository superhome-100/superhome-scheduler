<script lang="ts">
  import type { MemberRow } from '$lib/types/groupReservation';
  import MemberCard from './MemberCard.svelte';

  export let members: MemberRow[] = [];
</script>

<div class="members-section">
  <h3 class="members-title">Group Members</h3>
  <div class="members-grid">
    {#each members as member}
      <MemberCard {member} />
    {/each}
  </div>
</div>

<style>
  .members-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .members-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
  }

  .members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .members-section {
      margin-top: 0;
      padding-top: 0.5rem;
    }

    .members-title {
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .members-grid {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
  }

  /* Tablet Responsive */
  @media (max-width: 1024px) and (min-width: 769px) {
    .members-grid {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
  }
</style>
