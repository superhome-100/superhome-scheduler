<script>
	import { page } from '$app/stores';

	$: message = $page?.error ? $page?.error?.message : `${$page}`;
</script>

<div class="text-lg font-semibold">{message}</div>
