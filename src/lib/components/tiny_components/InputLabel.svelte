<script lang="ts">
	export let label = '';
	export let forInput = '';
</script>

<li class="flex mt-2">
	<div class="w-[100px] dark:text-white text-right mt-2"><label for={forInput}>{label}</label></div>
	<div class="flex-1">
		<slot />
	</div>
</li>
