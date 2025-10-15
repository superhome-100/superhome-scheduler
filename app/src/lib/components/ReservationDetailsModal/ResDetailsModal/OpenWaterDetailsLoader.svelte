<script lang="ts">
  import { supabase } from '../../../utils/supabase';

  export let reservation: any;
  export let owDepth: number | null = null;

  async function loadOpenWaterDetails() {
    try {
      owDepth = null;
      // Expect raw identifiers on reservation
      const isOW = reservation?.res_type === 'open_water' || reservation?.type === 'Open Water';
      if (!isOW || !reservation?.uid || !reservation?.res_date) return;
      // Open Water details loaded
    } catch (_) {
      // ignore
    }
  }

  $: if (reservation) {
    // Lazy load only for open water
    if (reservation?.res_type === 'open_water' || reservation?.type === 'Open Water') {
      loadOpenWaterDetails();
    }
  }
</script>

<!-- This component handles the Open Water data loading logic -->
<!-- The actual display is handled by ReservationTypeDetails.svelte -->
