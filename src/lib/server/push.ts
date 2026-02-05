import { PUBLIC_VAPID_SUBJECT } from '$env/static/public';
import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import { supabaseServiceRole } from './supabase';
import webpush, { type PushSubscription } from 'web-push';
import type { Reservation, User } from '$types';
import { dayjs } from '$lib/datetimeUtils';


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
    async send(userId: string, title: string, message: string, tag: string | undefined, url: string = '/') {
        try {
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
                })(d.pushSubscription as unknown as PushSubscription).catch((reason) => {
                    console.error(`couldn't send notification`, { user: userId, session: d.sessionId }, reason);
                    return reason;
                })
            }))
        } catch (e) {
            console.error("pushNotificationService.send", e)
        }
    },

    async sendSafe(userId: string, title: string, message: string, tag: string | undefined, url: string = '/') {
        try {
            await this.send(userId, title, message, tag, url);
        } catch (e) {
            console.error("pushNotificationService.send", e)
        }
    },

    async sendReservationFn(actor: User, rsvs: Reservation[], fn: (r: Reservation) => string) {
        await Promise.allSettled(rsvs
            .filter(r => r.user !== actor.id)
            .map(async (rsv) => this.sendSafe(rsv.user,
                `${upperFirst(rsv.category)} ${shortDateTime(rsv)}: ${fn(rsv)}!`,
                reservationDetails(rsv),
                rsv.id
            )))
    },

    async sendReservationStatus(actor: User, rsvs: Reservation[]) {
        await this.sendReservationFn(actor, rsvs, r => `[${r.status}]`);
    },

    async sendReservationCreated(actor: User, rsvs: Reservation[]) {
        await this.sendReservationFn(actor, rsvs, () => 'created');
    },

    async sendReservationModified(actor: User, rsvs: Reservation[]) {
        await this.sendReservationFn(actor, rsvs, () => 'modified');
    }
};

const upperFirst = (s: string) => s.length > 0 ? s[0].toUpperCase() + s.substring(1) : '';

const shortDateTime = (rsv: Reservation) => dayjs(rsv.date + 'T' + rsv.startTime).format('DD/MMM hh:mm');

const reservationDetails = (rsv: Reservation) => {
    const d: string[] = [
        `${rsv.resType} : [${rsv.status}]`,
    ];
    if (rsv.maxDepth) d.push(`depth: ${rsv.maxDepth}m`);
    if (rsv.numStudents) d.push(`students: ${rsv.numStudents}`);
    if (rsv.buddies.length > 0) d.push(`buddies: ${rsv.buddies.length}`);
    if (rsv.comments) d.push('', 'Comment: ' + rsv.comments);
    d.push(`at: ${rsv.date}: ${rsv.startTime.substring(0, 5)} - ${rsv.endTime.substring(0, 5)}`)
    return d.join(',\n');
};