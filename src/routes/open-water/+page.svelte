<script>
  import Month from '../../components/Month.svelte';
  import Day from '../../components/Day.svelte';

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
  <Month on:selectDay={handleSelectDay} category="openwater"/>
{:else}
  <Day on:back={handleBack} date={selectedDate} category="openwater"/>
{/if}