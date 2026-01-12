<script>
	import { getContext } from 'svelte';
	import { notifications } from '$lib/stores';
	import NotificationPopup from '$lib/components/NotificationPopup.svelte';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';

	const { open } = getContext('simple-modal');

	const showNotification = (ntf) => {
		open(
			NotificationPopup,
			{
				ntf
			},
			{},
			{
				onClosed: () => checkForNotifications($notifications)
			}
		);
	};

	function checkForNotifications(ntfs) {
		if (ntfs.length > 0) {
			showNotification(ntfs.pop());
		}
	}

	$: checkForNotifications($notifications.reverse());
</script>
