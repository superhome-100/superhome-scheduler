import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import webpush, { type PushSubscription } from 'web-push';
import type { User } from '$types';

webpush.setVapidDetails(
    'mailto:superhome.scheduler@gmail.com',
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
);

export const pushNotificationService = {
    async send(user: User, message: string, url: string = '/') {
        const subscription = user.pushSubscripton as PushSubscription | null | undefined;
        if (!subscription)
            return false;
        const payload = JSON.stringify({
            title: 'Superhome Scheduler',
            body: message,
            url
        });
        await webpush.sendNotification(subscription, payload);
        return true;
    }
};