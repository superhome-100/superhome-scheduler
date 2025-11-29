<script lang="ts">
  export let className: string = '';
  export let padding: boolean = true; // control default padding
  // Mobile-first, consistent body content wrapper used across pages (same as dashboard)
</script>

<div class={`flex-1 ${padding ? 'p-6' : 'p-0'} w-full ${className}`}>
  <div class="flex flex-col gap-6">
    <slot />
  </div>
</div>
