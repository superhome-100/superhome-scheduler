<script lang="ts">
	import { storedUser as user } from '$lib/client/stores';
	import { goto } from '$app/navigation';

	$: {
		if ($user) {
			goto('/');
		}
	}
</script>

<p style="text-align: center">
	Sorry! Seems We're having trouble communicating with the server right now. Please try again later.
</p>
<div style="width: 100%; text-align: center">
	<a href="/">
		<button>Home</button>
	</a>
</div>
