import { type Readable, writable } from 'svelte/store';
import { PUBLIC_VAPID_KEY } from '$env/static/public';

const subscriptionW = writable<PushSubscription | null | undefined>(undefined); // undefined = loading, null = not subbed
export const subscription: Readable<PushSubscription | null | undefined> = subscriptionW

export const pushService = {
    async init(server_has_push: boolean) {
        try {
            const permissionStatus = Notification.permission;
            if (permissionStatus === 'denied') {
                // User blocked notifications; you cannot ask again programmatically.
                // Advise them to check iOS Settings -> Notifications.
                subscriptionW.set(null);
            } else if (permissionStatus === 'default') {
                // You can show your "Enable" button.
                subscriptionW.set(undefined);
            } else if (permissionStatus === 'granted') {
                if (server_has_push) {
                    // Permission is good, but check getSubscription() to see if 
                    // the Push Service token is still valid.
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();
                    subscriptionW.set(sub);
                }
            }
        }
        catch (e) {
            subscriptionW.set(null);
            console.error('pushService.init', e)
        }
    },

    async subscribe(swr: ServiceWorkerRegistration) {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                subscriptionW.set(undefined);
                subscriptionW.set(null);
                return;
            }
            const permissionStatus = Notification.permission;
            if (permissionStatus === 'denied') {
                // User blocked notifications; you cannot ask again programmatically.
                // Advise them to check iOS Settings -> Notifications.
                subscriptionW.set(undefined);
                subscriptionW.set(null);
                return;
            } else if (permissionStatus === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    subscriptionW.set(undefined);
                    subscriptionW.set(null);
                    return;
                }
            }
            const sub = await swr.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: PUBLIC_VAPID_KEY
            });
            await this._sendToServer(sub);
            subscriptionW.set(sub);
        }
        catch (e) {
            subscriptionW.set(null);
            subscriptionW.set(undefined);
            console.error('pushService.subscribe', e)
        }
    },

    async unsubscribe() {
        try {
            subscriptionW.update(x => { x?.unsubscribe().then(() => console.log('unsubscribed'), r => console.error('unsubscribe error', r)); return undefined; });
            await this._sendToServer(null);
        }
        catch (e) {
            subscriptionW.set(undefined);
            console.error('pushService.unsubscribe', e)
        }
    },

    async _sendToServer(sub: PushSubscription | null) {
        const response = await fetch('/api/notification/subscribe', {
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
