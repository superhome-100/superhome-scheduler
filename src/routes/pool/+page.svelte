<script>
  import Month from '$lib/components/Month.svelte';
  import Day from '$lib/components/Day.svelte';

  let view = 'month';
  let selectedDate = null;

  function handleSelectDay(event) {
      view = 'day';
      selectedDate = event.detail.date;
  }

  function handleBack(event) {
      view = 'month';
  }

</script>

{#if view == 'month'}
  <Month on:selectDay={handleSelectDay} category="pool"/>
{:else}
  <Day on:back={handleBack} date={selectedDate} category="pool"/>
{/if}
