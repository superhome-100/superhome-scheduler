<script lang="ts">
  import '../styles/theme.css';
  import '../app.css';
  import '../styles/tailwind-utilities.css';
  // Root layout styles imported once globally
</script>

<div data-theme="superhome">
  <slot />
  <!-- Global theme wrapper to ensure DaisyUI theme applies site-wide -->
</div>
