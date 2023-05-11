<script>
    import { getContext } from 'svelte';
    import { notifications } from '$lib/stores.js';
    import NotificationPopup from '$lib/components/NotificationPopup.svelte';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { onMount } from 'svelte';

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
    }

    function checkForNotifications(ntfs) {
        console.log(ntfs.length);
        let today = datetimeToLocalDateStr(new Date());
        if (ntfs.length > 0) {
            let ntf = ntfs.pop();
            if ((ntf.startDate === 'default' || ntf.startDate <= today) 
                && (ntf.endDate === 'default' || ntf.endDate >= today)
            ) {
                showNotification(ntf);
            }
        }
    }

    $: checkForNotifications($notifications.reverse());

</script>
