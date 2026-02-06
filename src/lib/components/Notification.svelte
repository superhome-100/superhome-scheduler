<script lang="ts">
	import { getContext } from 'svelte';
	import NotificationPopup from '$lib/components/NotificationPopup.svelte';
	import { storedNotifications } from '$lib/client/stores';
	import type { Notifications } from '$types';

	const { open } = getContext('simple-modal');

	const showNotification = (ntf: Notifications) => {
		return new Promise((resove) => {
			open(
				NotificationPopup,
				{
					ntf
				},
				{},
				{
					onClosed: resove
				}
			);
		});
	};

	async function checkForNotifications(ntfs: Notifications[]) {
		while (ntfs.length > 0) {
			await showNotification(ntfs.pop());
		}
	}

	$: checkForNotifications($storedNotifications.reverse());
</script>
