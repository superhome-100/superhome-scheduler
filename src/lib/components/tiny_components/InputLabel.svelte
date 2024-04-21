<script lang="ts">
	export let label = '';
	export let forInput = '';
</script>

<li class="flex gap-2 mt-2">
	<div class="w-[70px] dark:text-white text-right mt-1"><label for={forInput}>{label}</label></div>
	<div class="flex-1 flex items-center">
		<slot />
	</div>
</li>
