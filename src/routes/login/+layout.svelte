<script lang="ts">
	import '../../app.postcss';

	$: isFacebook =
		typeof window !== 'undefined' && window.navigator
			? navigator.userAgent.includes('FBAN') || navigator.userAgent.includes('FBAV')
			: false;

</script>

<div id="app" class="flex px-1 mx-auto w-full">
	<main class="lg:ml-72 w-full mx-auto">
		<slot />
	</main>
</div>


{#if isFacebook}
	<article class="fixed text-center top-0 w-full h-full bg-orange-400 p-20">
		<h1 class="font-bold">Please don't use Facebook browser</h1>
		<br />
		<p>To use default browser:</p>
		<ul>
			<li><b>Android -</b> tap in the upper right-hand corner</li>
			<li><b>iOS -</b> tap in the lower right-hand corner</li>
		</ul>
	</article>
{/if}
