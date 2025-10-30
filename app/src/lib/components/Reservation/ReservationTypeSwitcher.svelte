<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { ReservationType } from '../../types/reservations';
  import './reservation-type-switcher.css';

  export let value: ReservationType = ReservationType.pool;
  export let urlSync: boolean = false; // when true, keep ?type= in URL
  export let size: 'xs' | 'sm' | 'md' = 'sm';
  export let className: string = '';

  const dispatch = createEventDispatcher<{ change: ReservationType }>();

  function setType(type: ReservationType) {
    if (value === type) return;

    if (urlSync && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('type', type);
      goto(url.toString(), { replaceState: true, noScroll: true });
    }

    dispatch('change', type);
  }
</script>

<div class={`flex justify-center mb-8 flex-wrap gap-6 button-container px-6 sm:px-4 ${className}`}>
  <button
    type="button"
    class={`btn btn-${size} btn-neutral`}
    class:btn-active={value === ReservationType.pool}
    class:active-res={value === ReservationType.pool}
    on:click={() => setType(ReservationType.pool)}
    title="Pool Reservations"
    aria-pressed={value === ReservationType.pool}
  >
    Pool
  </button>

  <button
    type="button"
    class={`btn btn-${size} btn-neutral`}
    class:btn-active={value === ReservationType.openwater}
    class:active-res={value === ReservationType.openwater}
    on:click={() => setType(ReservationType.openwater)}
    title="Open Water Reservations"
    aria-pressed={value === ReservationType.openwater}
  >
    Open Water
  </button>

  <button
    type="button"
    class={`btn btn-${size} btn-neutral`}
    class:btn-active={value === ReservationType.classroom}
    class:active-res={value === ReservationType.classroom}
    on:click={() => setType(ReservationType.classroom)}
    title="Classroom Reservations"
    aria-pressed={value === ReservationType.classroom}
  >
    Classroom
  </button>
</div>

