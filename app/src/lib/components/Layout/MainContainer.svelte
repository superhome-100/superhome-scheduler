<script lang="ts">
  export let constrain: boolean = true; // whether to apply max width and centering
  export let padding: boolean = false;  // whether to apply default padding
  export let className: string = '';
</script>

<!--
  MainContainer: shared page content wrapper
  - constrain: adds max-w and horizontal centering
  - padding: adds responsive padding (off by default per current design)
-->
<div
  class={`
    ${constrain ? 'w-full' : 'w-full'}
    ${padding ? 'p-4 sm:p-6 lg:p-8' : 'p-0'}
    ${className}
  `}
>
  <slot />
</div>
