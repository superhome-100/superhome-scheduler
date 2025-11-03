<script lang="ts">
  import { getOpenWaterTypeDisplay } from '../../../Reservation/reservationUtils';

  export let filteredReservations: any[] = [];
  export let findAssignment: (uid: string, period: 'AM' | 'PM') => { buoy: string; boat: string };
  export let assignmentVersion: number = 0;
  export let onShowReservationDetails: (res: any) => void;
  export let timePeriod: 'AM' | 'PM' | undefined = undefined;

  // Only open water rows
  $: owRows = (filteredReservations || []).filter((r) => r.res_type === 'open_water');
  $: rows = timePeriod ? owRows.filter((r) => (r?.time_period === timePeriod)) : owRows;

  function timeOf(res: any): 'AM' | 'PM' {
    return (res?.time_period === 'PM' ? 'PM' : 'AM') as 'AM' | 'PM';
  }
</script>

<div class="w-full">
  <div class="overflow-x-auto">
    <table class="table table-zebra table-sm w-full">
      <thead>
        <tr>
          <th class="w-16">Time</th>
          <th class="w-28">Buoy</th>
          <th class="w-28">Boat</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>

<style>
  /* Mobile-first: compact table; larger screens inherit */
  :global(.table-sm th),
  :global(.table-sm td) {
    padding-top: 0.4rem;
    padding-bottom: 0.4rem;
  }
</style>
