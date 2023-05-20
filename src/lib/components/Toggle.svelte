<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let checked = false;

	$: dispatch('change', { checked });

	const switchStyle = 'relative inline-block w-14 h-8';
	const sliderStyle = `
        absolute 
        cursor-pointer 
        top-0 
        left-0 
        right-0 
        bottom-0 
        bg-gray-300 
        transition 
        duration-300 
        rounded-2xl 
    `;
	const sliderBeforeStyle = `
        before:absolute 
        before:content-[""] 
        before:h-6 
        before:w-6 
        before:left-1 
        before:bottom-1 
        before:bg-white 
        before:transition 
        before:duration-300 
        before:rounded-full 
    `;
</script>

<label class={switchStyle}>
	<input bind:checked class="opacity-0 w-0 h-0" type="checkbox" />
	<span class="slider {sliderStyle} {sliderBeforeStyle}" />
</label>

<style>
	input:checked + .slider {
		background-color: #2196f3;
	}

	input:focus + .slider {
		box-shadow: 0 0 1px #2196f3;
	}

	input:checked + .slider:before {
		-webkit-transform: translateX(24px);
		-ms-transform: translateX(24px);
		transform: translateX(24px);
	}
</style>
