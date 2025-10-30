<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ReservationType } from '../../types/reservations';
  import ReservationTypeSwitcher from './ReservationTypeSwitcher.svelte';

  export let selectedType: ReservationType = ReservationType.openwater;

  const dispatch = createEventDispatcher<{ typeSelected: { type: ReservationType } }>();

  function handleChange(type: ReservationType) {
    selectedType = type;
    dispatch('typeSelected', { type });
  }
</script>

<!-- Reservation Type Switcher (no URL sync) -->
<ReservationTypeSwitcher
  value={selectedType}
  urlSync={false}
  size="sm"
  on:change={(e) => handleChange(e.detail)}
/>
