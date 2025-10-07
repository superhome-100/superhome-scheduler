<script lang="ts">
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let text: string = 'Loading...';
  export let variant: 'default' | 'login' | 'overlay' = 'default';
  export let zIndex: number = 50;

  const sizeClasses = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2', 
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-10 h-10 border-4'
  };

  const spinnerClass = `loading-spinner ${sizeClasses[size]}`;
</script>

{#if variant === 'overlay'}
  <div 
    class="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center"
    style="z-index: {zIndex};"
  >
    <div class="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
      <div class={spinnerClass}></div>
      {#if text}
        <div class="text-sm font-medium text-gray-600">{text}</div>
      {/if}
    </div>
  </div>
{:else if variant === 'login'}
  <div class="flex flex-col items-center justify-center gap-4 min-h-[200px]">
    <div class="loading-spinner w-6 h-6 border-2 border-white/30 border-t-white"></div>
    {#if text}
      <div class="text-sm font-medium text-white/80">{text}</div>
    {/if}
  </div>
{:else}
  <div class="flex flex-col items-center gap-3 p-4">
    <div class={spinnerClass}></div>
    {#if text}
      <div class="text-sm font-medium text-gray-600">{text}</div>
    {/if}
  </div>
{/if}