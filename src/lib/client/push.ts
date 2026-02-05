import { writable } from 'svelte/store';
import { PUBLIC_VAPID_KEY } from '$env/static/public';

export const subscription = writable<PushSubscription | null | undefined>(undefined); // undefined = loading, null = not subbed

export const pushService = {
    async init(server_has_push: boolean) {
        try {
            const permissionStatus = Notification.permission;
            if (permissionStatus === 'denied') {
                // User blocked notifications; you cannot ask again programmatically.
                // Advise them to check iOS Settings -> Notifications.
                subscription.set(null);
            } else if (permissionStatus === 'default') {
                // You can show your "Enable" button.
                subscription.set(undefined);
            } else if (permissionStatus === 'granted') {
                if (server_has_push) {
                    // Permission is good, but check getSubscription() to see if 
                    // the Push Service token is still valid.
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();
                    subscription.set(sub);
                }
            }
        }
        catch (e) {
            subscription.set(null);
            console.error('pushService.init', e)
        }
    },

    async subscribe(swr: ServiceWorkerRegistration) {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                subscription.set(undefined);
                subscription.set(null);
                return;
            }
            const permissionStatus = Notification.permission;
            if (permissionStatus === 'denied') {
                // User blocked notifications; you cannot ask again programmatically.
                // Advise them to check iOS Settings -> Notifications.
                subscription.set(undefined);
                subscription.set(null);
                return;
            } else if (permissionStatus === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    subscription.set(undefined);
                    subscription.set(null);
                    return;
                }
            }
            const sub = await swr.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: PUBLIC_VAPID_KEY
            });
            await this._sendToServer(sub);
            subscription.set(sub);
        }
        catch (e) {
            subscription.set(null);
            subscription.set(undefined);
            console.error('pushService.subscribe', e)
        }
    },

    async unsubscribe() {
        try {
            subscription.update(x => { x?.unsubscribe().then(() => console.log('unsubscribed'), r => console.error('unsubscribe error', r)); return undefined; });
            await this._sendToServer(null);
        }
        catch (e) {
            subscription.set(undefined);
            console.error('pushService.unsubscribe', e)
        }
    },

    async _sendToServer(sub: PushSubscription | null) {
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(sub),
            headers: { 'Content-Type': 'application/json' }
        });
        let data = (await response.json()) as {
            status: 'success';
        } | {
            status: 'error';
            error: string;
        };
        if (data.status === 'error')
            throw Error(data.error);
        return data;
    }
};
