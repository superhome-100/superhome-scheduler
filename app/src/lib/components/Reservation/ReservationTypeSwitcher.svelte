<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { ReservationType } from '../../types/reservations';
  import './reservation-type-switcher.css';

  export let value: ReservationType = ReservationType.openwater;
  export let size: 'xs' | 'sm' | 'md' = 'sm';
  export let className: string = '';
  export let date: string | null = null;
  export let compact: boolean = false;
  
  $: getHref = (type: string) => {
    return date ? `/reservation/${type}/${date}` : `/reservation/${type}`;
  };
</script>

<div
  class={`flex justify-start flex-wrap gap-6 ${compact ? '' : 'mb-8'} ${compact ? '' : 'button-container'} ${className}`}
>
  <a
    href={getHref('openwater')}
    class={`btn btn-${size} bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 hover:text-slate-800`}
    class:active-res={value === ReservationType.openwater}
    title="Open Water Reservations"
    role="button"
  >
    Open Water
  </a>

  <a
    href={getHref('pool')}
    class={`btn btn-${size} bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 hover:text-slate-800`}
    class:active-res={value === ReservationType.pool}
    title="Pool Reservations"
    role="button"
  >
    Pool
  </a>

  <a
    href={getHref('classroom')}
    class={`btn btn-${size} bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 hover:text-slate-800`}
    class:active-res={value === ReservationType.classroom}
    title="Classroom Reservations"
    role="button"
  >
    Classroom
  </a>
</div>

