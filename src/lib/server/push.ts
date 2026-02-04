import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import webpush, { type PushSubscription } from 'web-push';
import type { User } from '$types';
import { supabaseServiceRole } from './supabase';

webpush.setVapidDetails(
    'mailto:superhome.scheduler@gmail.com',
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
);

export const pushNotificationService = {
    async send(user: User, message: string, url: string = '/') {
        const { data } = await supabaseServiceRole
            .from("UserSessions")
            .select("sessionId, pushSubscription")
            .eq("userId", user.id)
            .throwOnError()

        data.map(d => {
            if (d.pushSubscription) {
                return (async (subscription) => {
                    const payload = JSON.stringify({
                        title: 'Superhome Scheduler',
                        body: message,
                        url
                    });
                    await webpush.sendNotification(subscription, payload);
                    console.log('push sent', { user: user.id, session: d.sessionId });
                })(d.pushSubscription as unknown as PushSubscription).catch(reason => {
                    console.error(`couldn't send notification`, { user: user.id, session: d.sessionId }, reason);
                })
            }
        })
    }
};