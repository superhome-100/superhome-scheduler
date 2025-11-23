<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { ReservationType } from '../../types/reservations';
  import './reservation-type-switcher.css';

  export let value: ReservationType = ReservationType.openwater;
  export let urlSync: boolean = false; // when true, keep ?type= in URL
  export let size: 'xs' | 'sm' | 'md' = 'sm';
  export let className: string = '';
  export let date: string | null = null;
  
  $: getHref = (type: string) => {
    return date ? `/reservation/${type}/${date}` : `/reservation/${type}`;
  };
</script>

<div class={`flex justify-center mb-8 flex-wrap gap-6 button-container px-6 sm:px-4 ${className}`}>
  <a
    href={getHref('openwater')}
    class={`btn btn-${size} btn-neutral`}
    class:btn-active={value === ReservationType.openwater}
    class:active-res={value === ReservationType.openwater}
    title="Open Water Reservations"
    role="button"
  >
    Open Water
  </a>

  <a
    href={getHref('pool')}
    class={`btn btn-${size} btn-neutral`}
    class:btn-active={value === ReservationType.pool}
    class:active-res={value === ReservationType.pool}
    title="Pool Reservations"
    role="button"
  >
    Pool
  </a>

  <a
    href={getHref('classroom')}
    class={`btn btn-${size} btn-neutral`}
    class:btn-active={value === ReservationType.classroom}
    class:active-res={value === ReservationType.classroom}
    title="Classroom Reservations"
    role="button"
  >
    Classroom
  </a>
</div>

