<script lang="ts">
	import { logger } from '@sentry/core';

	export let onRefresh: () => Promise<void> | void = async () => {};

	// Configuration
	export let resistance = 0.1; // 0.2-0.3 is standard for "snappy" feel
	const REFRESH_THRESHOLD = 350; // Total pull distance to trigger
	const MIN_PULL_DETECTION = 100; // Distance before UI shows up

	let container: HTMLDivElement;
	let isAtTop = false;
	let startY = 0;
	let currentY = 0;
	let pulling = false;
	let shouldRefresh = false;
	let translateY = 0;
	let rotateDeg = 0;
	let isTransitioning = false; // Controls CSS transition

	const touchStart = (event: TouchEvent) => {
		// Reset transition state for immediate finger tracking
		isTransitioning = false;
		isAtTop = container.scrollTop === 0;
		startY = event.touches[0].clientY;
	};

	const touchMove = (event: TouchEvent) => {
		if (!isAtTop) return;

		currentY = event.touches[0].clientY;
		const diff = currentY - startY;

		// Ignore upward swipes
		if (diff <= 0) return;

		// Prevent native browser "bounce" and pull-to-refresh
		if (diff > 10 && event.cancelable) {
			event.preventDefault();
		}

		if (diff > MIN_PULL_DETECTION) {
			pulling = true;
			translateY = diff * resistance;

			// Calculate rotation based on progress toward threshold
			const progress = Math.min(diff / REFRESH_THRESHOLD, 1);
			rotateDeg = progress * 360;

			shouldRefresh = diff > REFRESH_THRESHOLD;
		}
	};

	const touchEnd = () => {
		isTransitioning = true; // Enable smooth snap-back

		if (shouldRefresh) {
			refresh();
			translateY = 60; // Hang at 60px while loading
		} else {
			reset();
		}
	};

	const reset = () => {
		translateY = 0;
		pulling = false;
		shouldRefresh = false;
		rotateDeg = 0;
	};

	const refresh = async () => {
		try {
			await onRefresh();
		} catch (e) {
			console.error('onRefresh', e);
		}
		// Artificial delay so the user sees the "success" state
		setTimeout(() => {
			reset();
		}, 1000);
	};
</script>

<div
	bind:this={container}
	on:touchstart={touchStart}
	on:touchmove={touchMove}
	on:touchend={touchEnd}
	class="refresher"
>
	{#if pulling}
		<div class="refresher-indicator" class:refreshing={shouldRefresh}>
			<div
				class="refresher-icon"
				style="transform: rotate({rotateDeg}deg); animation-play-state: {shouldRefresh
					? 'running'
					: 'paused'};"
			/>
		</div>
	{/if}

	<div
		class="refresher-content-wrapper"
		class:animate={isTransitioning}
		style="transform: translateY({translateY}px)"
	>
		<slot />
	</div>
</div>

<style>
	.refresher {
		height: 100dvh;
		width: 100%;
		position: relative;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		display: flex;
		flex-direction: column;
	}

	.refresher-indicator {
		position: absolute;
		left: 0;
		right: 0;
		top: 20px;
		z-index: 10;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.refresher-icon {
		width: 28px;
		height: 28px;
		border: 3px solid rgba(0, 135, 255, 0.2);
		border-top-color: #0087ff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.refresher-content-wrapper {
		flex: 1 0 auto;
		width: 100%;
		will-change: transform;
	}

	/* Transition only when NOT dragging */
	.animate {
		transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
