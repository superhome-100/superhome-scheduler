<script lang="ts">
  import Reservation from '../../../lib/components/Reservation/Reservation.svelte';
  import { ReservationType } from '../../../lib/types/reservations';
</script>

<Reservation initialType={ReservationType.openwater} />
