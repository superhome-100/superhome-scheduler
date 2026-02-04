import { PUBLIC_VAPID_SUBJECT } from '$env/static/public';
import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import webpush, { type PushSubscription } from 'web-push';
import type { User } from '$types';
import { supabaseServiceRole } from './supabase';

webpush.setVapidDetails(
    PUBLIC_VAPID_SUBJECT,
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
);

export const pushNotificationService = {
    async send(user: User, message: string, url: string = '/') {
        const { data } = await supabaseServiceRole
            .from("UserSessions")
            .select("sessionId, pushSubscription")
            .eq("userId", user.id)
            .not("pushSubscription", "is", null)
            .throwOnError()

        return await Promise.allSettled(data.map(d => {
            return (async (subscription) => {
                const payload = JSON.stringify({
                    title: 'Superhome Scheduler',
                    body: message,
                    data: { url }
                });
                const resp = await webpush.sendNotification(subscription, payload);
                console.log('push sent', { user: user.id, session: d.sessionId }, resp);
                return resp;
            })(d.pushSubscription as unknown as PushSubscription).catch(reason => {
                console.error(`couldn't send notification`, { user: user.id, session: d.sessionId }, reason);
                return reason;
            })
        }))
    }
};