import { writable } from 'svelte/store';
import { PUBLIC_VAPID_KEY } from '$env/static/public';

export const subscription = writable<PushSubscription | null>(undefined); // undefined = loading, null = not subbed

export const pushService = {
    async init() {
        const subscribed = await this._sync();
        if (!subscribed) {
            await this._subscribe();
        }
    },

    async _sync() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window))
            return false;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        subscription.set(sub);
        return !!sub;
    },

    async _subscribe() {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: PUBLIC_VAPID_KEY
        });
        this._sendToServer(sub);
        subscription.set(sub);
    },

    async _sendToServer(sub: PushSubscription) {
        await fetch('/api/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(sub),
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
