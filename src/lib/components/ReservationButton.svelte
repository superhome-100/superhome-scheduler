<script>
    export let category;
    
    $: outer = (category === 'pool') ? 'fill-pool-bg-from' : (category === 'openwater') ? 'fill-openwater-bg-to' : (category === 'classroom') ? 'fill-classroom-bg-to' : undefined;
    $: outerDark = (category === 'pool') ? 'dark:fill-pool-bg-from' : (category === 'openwater') ? 'dark:fill-openwater-bg-to' : (category === 'classroom') ? 'dark:fill-classroom-bg-to' : undefined;


</script>

<svg class='w-8 h-8' viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
    <rect class='{outer} dark:fill-white' width='9' height='9' x='0.5' y='0.5' />
    <rect class='fill-white {outerDark}' width='8' height='8' x='1' y='1' />
    <path
    class='{outer} dark:fill-white'
    d='
      M 4.5 4.5
      l 0 -2
      a 0.7 0.7 0 0 1 1 0
      l 0 2
      l 2 0
      a 0.7 0.7 0 0 1 0 1
      l -2 0
      l 0 2
      a 0.7 0.7 0 0 1 -1 0
      l 0 -2
      l -2 0
      a 0.7 0.7 0 0 1 0 -1
      z'
    />
</svg>

