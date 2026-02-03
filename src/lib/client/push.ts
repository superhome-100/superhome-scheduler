import { get, writable } from 'svelte/store';
import { PUBLIC_VAPID_KEY } from '$env/static/public';

export const subscription = writable<PushSubscription | null>(undefined); // undefined = loading, null = not subbed

export const pushService = {
    async init() {
        let sub = get(subscription);
        if (sub)
            return;

        if (!('serviceWorker' in navigator) || !('PushManager' in window))
            return;

        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.getSubscription();

        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: PUBLIC_VAPID_KEY
            });
        }

        await this._sendToServer(sub);
        subscription.set(sub);
    },

    async _sendToServer(sub: PushSubscription) {
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
