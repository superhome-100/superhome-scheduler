<script>
    export let category;
    
    $: outer = (category === 'pool') 
        ? 'fill-pool-bg-to' 
        : (category === 'openwater') 
            ? 'fill-openwater-bg-to' 
            : (category === 'classroom') 
                ? 'fill-classroom-bg-to' : undefined;

    $: innerDark = (category === 'pool') 
        ? 'dark:fill-pool-bg-to' 
        : (category === 'openwater') 
            ? 'dark:fill-openwater-bg-to' 
            : (category === 'classroom') 
                ? 'dark:fill-classroom-bg-to' : undefined;
    
    $: innerHover = (category === 'pool') 
            ? 'group-hover:fill-pool-bg-to' 
            : (category === 'openwater') 
                ? 'group-hover:fill-openwater-bg-to' 
                : (category === 'classroom') 
                    ? 'group-hover:fill-classroom-bg-to' : undefined;

        $: outerDarkHover = (category === 'pool') 
            ? 'group-hover:dark:fill-pool-bg-to' 
            : (category === 'openwater') 
                ? 'group-hover:dark:fill-openwater-bg-to' 
                : (category === 'classroom') 
                    ? 'group-hover:dark:fill-classroom-bg-to' : undefined;

</script>

<svg class='group w-8 h-8 cursor-pointer' viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
    <rect class='{outer} dark:fill-white group-hover:fill-white {outerDarkHover}' width='12' height='12' x='0' y='0' rx='3' />
    <rect class='fill-white {innerDark} {innerHover} group-hover:dark:fill-white' width='10' height='10' x='1' y='1' rx='2.5' />
    <path
    class='{outer} dark:fill-white hover:fill-white {outerDarkHover}'
    d='
      M 5.5 5.5
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

