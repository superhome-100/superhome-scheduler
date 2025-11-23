<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { ReservationType } from '../../types/reservations';
  import ReservationTypeSwitcher from '../Reservation/ReservationTypeSwitcher.svelte';

  export let selectedType: ReservationType = ReservationType.openwater;

  const dispatch = createEventDispatcher<{ typeSelected: { type: ReservationType } }>();

  // Initialize from URL parameter on mount (preserve behavior)
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const validTypes = Object.values(ReservationType) as string[];
    if (typeParam && validTypes.includes(typeParam)) {
      selectedType = typeParam as ReservationType;
    }
  });

  function handleChange(type: ReservationType) {
    selectedType = type;
    dispatch('typeSelected', { type });
  }
</script>

<!-- Admin Calendar Type Switcher (URL synced) -->
<ReservationTypeSwitcher
  value={selectedType}
  urlSync={true}
  size="sm"
  on:change={(e) => handleChange(e.detail)}
/>
