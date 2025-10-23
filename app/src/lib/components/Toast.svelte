<script lang="ts">
  export let type: 'success' | 'error' | 'info' | 'warning' = 'info';
  export let message = '';
  export let open = false;
  export let duration = 4000; // ms
  export let position: 'start' | 'center' | 'end' = 'end';
  export let vertical: 'top' | 'middle' | 'bottom' = 'bottom';

  let timer: any;

  $: if (open && duration > 0) {
    clearTimeout(timer);
    timer = setTimeout(() => (open = false), duration);
  }

  const icon = {
    success: '✅',
    error: '⚠️',
    info: 'ℹ️',
    warning: '⚠️'
  }[type];

  $: containerClass = `toast z-50 ${
    position === 'center' ? 'toast-center' : position === 'start' ? 'toast-start' : 'toast-end'
  } ${
    vertical === 'top' ? 'toast-top' : vertical === 'middle' ? 'toast-middle' : 'toast-bottom'
  }`;
</script>

{#if open}
  <div class={containerClass}>
    <div class="alert"
      class:alert-success={type==='success'}
      class:alert-error={type==='error'}
      class:alert-info={type==='info'}
      class:alert-warning={type==='warning'}
    >
      <span class="font-medium mr-2">{icon}</span>
      <span>{message}</span>
    </div>
  </div>
{/if}

<style>
  /* No custom CSS; rely on daisyUI classes */
</style>
