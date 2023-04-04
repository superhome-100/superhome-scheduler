<script>
  export let itemLabel;
  export let highlighted;
</script>

<style>
li.autocomplete-items {
  list-style: none;
  border-bottom: 1px solid #d4d4d4;
  z-index: 99;
  cursor: pointer;
  background-color: #fff;
}

li.autocomplete-items:hover {
  /*when hovering an item:*/
  background-color: DodgerBlue;
  color: white;
}

li.autocomplete-items:active {
  /*when navigating through the items using the arrow keys:*/
  background-color: DodgerBlue !important;
  color: #ffffff;
}	
	
.autocomplete-active {
  /*when navigating through the items using the arrow keys:*/
  background-color: DodgerBlue !important;
  color: #ffffff;
}
</style>

<li class="autocomplete-items" class:autocomplete-active={highlighted} on:click>{itemLabel}</li>
