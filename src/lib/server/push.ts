import { PUBLIC_VAPID_SUBJECT } from '$env/static/public';
import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import { supabaseServiceRole } from './supabase';
import webpush, { type PushSubscription } from 'web-push';

webpush.setVapidDetails(
    PUBLIC_VAPID_SUBJECT,
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
);

export const pushNotificationService = {
    /**
     * Message will look like:
     * #1: <title>
     * #2: From Superhome
     * #3: <message>
     */
    async send(userId: string, title: string, message: string, url: string = '/') {
        const { data } = await supabaseServiceRole
            .from("UserSessions")
            .select("sessionId, pushSubscription")
            .eq("userId", userId)
            .not("pushSubscription", "is", null)
            .throwOnError()

        return await Promise.allSettled(data.map(d => {
            return (async (subscription) => {
                const payload = JSON.stringify({
                    title,
                    body: message,
                    data: { url }
                });
                const resp = await webpush.sendNotification(subscription, payload);
                console.log('push sent', { user: userId, session: d.sessionId }, resp);
                return resp;
            })(d.pushSubscription as unknown as PushSubscription).catch(reason => {
                console.error(`couldn't send notification`, { user: userId, session: d.sessionId }, reason);
                return reason;
            })
        }))
    }
};