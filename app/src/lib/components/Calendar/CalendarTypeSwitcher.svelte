<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ReservationType } from '../../types/reservations';
  import ReservationTypeSwitcher from '../Reservation/ReservationTypeSwitcher.svelte';

  export let value: ReservationType = ReservationType.pool;
  export let date: string | null = null;

  const dispatch = createEventDispatcher<{ change: ReservationType }>();

  function handleChange(type: ReservationType) {
    value = type;
    dispatch('change', value);
  }
</script>

<!-- Calendar Type Switcher (URL synced) -->
<ReservationTypeSwitcher
  {value}
  {date}
  urlSync={true}
  size="sm"
  on:change={(e) => handleChange(e.detail)}
/>


