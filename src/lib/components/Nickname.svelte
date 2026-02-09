<script lang="ts">
	import { enhance } from '$app/forms';
	import { storedUser as user } from '$lib/client/stores';
	import { storedUsers as users } from '$lib/client/stores';
	import { toast } from 'svelte-french-toast';
	import { getContext } from 'svelte';
	import { popup } from '$lib/components/Popup.svelte';

	let { close } = getContext('simple-modal');

	function removeFocus(e) {
		if (e.keyCode == 13) {
			this.blur();
		}
	}

	const updateNickname = async ({ form, formData, action, cancel }) => {
		let userNicknames = Object.values($users).map((user) => user.nickname);

		if (formData.get('nickname').length == 0) {
			cancel();
			close();
			return;
		}
		if (formData.get('nickname') === $user?.nickname) {
			cancel();
			close();
			return;
		}
		if (userNicknames.includes(formData.get('nickname'))) {
			popup('That name is already taken.  Please choose a different name.');
			cancel();
			return;
		}

		close();
		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					toast.success('Display name updated');
					break;
				default:
					console.error(result);
					toast.error('Could not update display name!');
					break;
			}
		};
	};
</script>

<div class="text-center dark:text-white mb-2">Set your display name</div>
<form method="POST" action="/?/nickname" use:enhance={updateNickname} class="text-center mb-2">
	<input type="hidden" name="id" value={$user?.id} />
	<input
		type="text"
		class="text-center w-44 text-xs"
		name="nickname"
		placeholder={$user?.nickname}
		on:keypress={removeFocus}
	/>
</form>
