<script lang="ts">
  // Simple test page to verify SvelteKit is working
  let message = 'SvelteKit is working!';
  let count = 0;
  
  function increment() {
    count += 1;
  }
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">{message}</h1>
  <p class="mb-4">Count: {count}</p>
  <button 
    class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    on:click={increment}
  >
    Increment
  </button>
  
  <div class="mt-8">
    <h2 class="text-xl font-semibold mb-2">Environment Check:</h2>
    <ul class="list-disc list-inside">
      <li>Supabase URL: {import.meta.env.VITE_PUBLIC_SUPABASE_URL || 'Not set'}</li>
      <li>Node Environment: {import.meta.env.MODE}</li>
      <li>Current Time: {new Date().toLocaleString()}</li>
    </ul>
  </div>
</div>
