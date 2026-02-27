<script lang="ts">
	export let resistance = 0.1;
	export let onRefresh = () => {};

	let startY = 0;
	let currentY = 0;
	let pulling = false;
	let rotateDeg = 0;
	let shouldRefresh = false;
	let translateY = 0;
	let container: HTMLDivElement;
	let isAtTop = false;

	const touchStart = (event) => {
		startY = event.touches[0].clientY;
		isAtTop = container.scrollTop === 0;
	};

	const touchMove = (event) => {
		if (!isAtTop) return;
		currentY = event.touches[0].clientY;

		const diff = currentY - startY;

		// Ignore upward swipes
		if (diff <= 0) return;

		if (diff > 100) {
			pulling = true;
			rotateDeg = diff * 1;
			translateY = diff * resistance;

			if (rotateDeg > 360) {
				shouldRefresh = true;
			} else {
				shouldRefresh = false;
			}
		} else {
			pulling = false;
		}
	};

	const touchEnd = () => {
		if (shouldRefresh) {
			rotateDeg = 0;
			refresh();

			translateY = 60;
		} else {
			translateY = 0;
			pulling = false;
			shouldRefresh = false;
		}
	};

	const refresh = async () => {
		await onRefresh();

		setTimeout(() => {
			translateY = 0;
			pulling = false;
			shouldRefresh = false;
		}, 2000);
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
		<div class="refresher-indicator">
			{#if shouldRefresh}
				<div class="refresher-icon" style="animation-play-state: running;" />
			{:else}
				<div
					class="refresher-icon"
					style="transform: rotate({rotateDeg}deg); animation-play-state: paused;"
				/>
			{/if}
		</div>
	{/if}

	<div class="refresher-content-wrapper" style="transform: translateY({translateY}px)">
		<slot />
	</div>
</div>

<style>
	.refresher {
		min-height: 100vh;
		min-height: 100dvh;
		width: 100%;
		height: 100dvh;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.refresher-indicator {
		left: 0;
		position: fixed;
		right: 0;
		top: 30px;
	}

	.refresher-icon {
		animation: spin 1s linear infinite;
		border: 2px solid transparent;
		border-radius: 50%;
		border-top-color: #0087ff;
		height: 20px;
		margin: auto;
		width: 20px;
	}

	.refresher-content-wrapper {
		/* transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); */
		flex: 1 0 auto; /* Grow to fill, do not shrink, auto basis */
		width: 100%;
		height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}
</style>
