<script>
	export let resistance = 0.3;
	export let onRefresh = () => {};

	let startY = 0;
	let currentY = 0;
	let pulling = false;
	let rotateDeg = 0;
	let shouldRefresh = false;
	let translateY = 0;

	const touchStart = (event) => {
		startY = event.touches[0].clientY;
	};

	const touchMove = (event) => {
		currentY = event.touches[0].clientY;

		if (currentY - startY > 20) {
			pulling = true;
			rotateDeg = (currentY - startY) * 1;
			translateY = (currentY - startY) * resistance;

			if (rotateDeg > 180) {
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

<div on:touchstart={touchStart} on:touchmove={touchMove} on:touchend={touchEnd} class="refresher">
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
		height: 100%;
		width: 100%;
		position: relative;
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
		transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}
</style>
