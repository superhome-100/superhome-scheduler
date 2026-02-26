<script lang="ts">
	import { browser } from '$app/environment';

	/** @type {boolean} */
	export let show = false;
	/** @type {number} */
	export let x = 0;
	/** @type {number} */
	export let y = 0;

	let element: Node;
	let menuWidth = 0;
	let menuHeight = 0;

	// Collision detection logic
	$: adjustedX = 0;
	$: adjustedY = 0;

	$: if (browser && show) {
		// Clamp X: Ensure 0 <= adjustedX <= (window.innerWidth - menuWidth)
		adjustedX = Math.max(0, Math.min(x, window.innerWidth - menuWidth));

		// Clamp Y: Ensure 0 <= adjustedY <= (window.innerHeight - menuHeight)
		adjustedY = Math.max(0, Math.min(y, window.innerHeight - menuHeight));
	}

	function handleOutsideClick(event: Event) {
		if (show && element && !element.contains(event.target)) {
			show = false;
		}
	}
</script>

<svelte:window on:mousedown={handleOutsideClick} />

{#if show}
	<div
		bind:this={element}
		bind:clientWidth={menuWidth}
		bind:clientHeight={menuHeight}
		class="floating-container"
		style:top="{adjustedY}px"
		style:left="{adjustedX}px"
	>
		<slot />
	</div>
{/if}

<style>
	.floating-container {
		position: fixed;
		z-index: 9999;
		/* Reset pointer events for the container, 
           allowing the slot content to define its own layout */
		pointer-events: auto;
	}
</style>
