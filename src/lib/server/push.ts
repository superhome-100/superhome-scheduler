import { PUBLIC_VAPID_SUBJECT } from '$env/static/public';
import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import { supabaseServiceRole } from './supabase';
import webpush, { type PushSubscription } from 'web-push';
import type { Reservation, User } from '$types';
import { dayjs } from '$lib/datetimeUtils';
import { LRUCache } from 'lru-cache'
import type { Json } from '$lib/supabase.types';
import { getRandomElement } from '$lib/utils';
import { console_error } from './sentry';

webpush.setVapidDetails(
    PUBLIC_VAPID_SUBJECT,
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
);


const userIdToPushCache = new LRUCache<string, {
    sessionId: string;
    pushSubscription: Json;
}[]>({
    max: 1000,
    ttl: 1000 * 5 // ms
})

export interface BulkPushResut {
    success: number;
    failure: number;
}

export const pushNotificationService = {
    /**
     * Message will look like:
     * #1: <title>
     * #2: From Superhome
     * #3: <message>
     */
    async send(userId: string, title: string, message: string, url: string = '/'): Promise<BulkPushResut[]> {
        try {
            const pss = await this._getPushSubscriptions(userId);
            return await Promise.all(pss.map(d => {
                return (async (subscription) => {
                    const payload = JSON.stringify({
                        title,
                        body: message,
                        data: { url }
                    });
                    const resp = await webpush.sendNotification(subscription, payload);
                    console.info('push sent', { user: userId, session: d.sessionId }, resp);
                    return { success: 1, failure: 0 };
                })(d.pushSubscription as unknown as PushSubscription).catch((reason) => {
                    console_error(`couldn't send notification`, { user: userId, session: d.sessionId }, reason);
                    return { success: 0, failure: 1 };
                })
            }))
        } catch (e) {
            console_error("pushNotificationService.send", e)
            return [{ success: 0, failure: 1 }];
        }
    },

    async _getPushSubscriptions(userId: string) {
        let pss = userIdToPushCache.get(userId);
        if (pss) return pss;
        const { data } = await supabaseServiceRole
            .from("UserSessions")
            .select("sessionId, pushSubscription")
            .eq("userId", userId)
            .not("pushSubscription", "is", null)
            .throwOnError()
        userIdToPushCache.set(userId, data);
        return data;
    },

    async sendSafe(userId: string, title: string, message: string, url: string = '/') {
        try {
            return await this.send(userId, title, message, url);
        } catch (e) {
            console_error("pushNotificationService.send", e)
        }
    },

    async sendReservationFn(actor: User, rsvs: Reservation[], fn: (r: Reservation) => string) {
        await Promise.allSettled(rsvs
            .filter(r => r.user !== actor.id)
            .map(async (rsv) => this.sendSafe(rsv.user,
                reservationTitle(rsv, fn),
                reservationDetails(rsv),
                `/single-day/${rsv.category}/${rsv.date}`
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

const reservationTitle = (rsv: Reservation, fn: (r: Reservation) => string) => {
    return reservationCategoryIcon(rsv) + `${upperFirst(rsv.category)} ${shortDateTime(rsv)}: ${fn(rsv)}`
}

const reservationDetails = (rsv: Reservation) => {
    const d: string[] = [
        `${rsv.resType}: ${rsv.status}` + reservationStatusIcon(rsv)
    ];
    if (rsv.maxDepth) d.push(`depth: ${rsv.maxDepth}m`);
    if (rsv.numStudents) d.push(`students: ${rsv.numStudents}`);
    if (rsv.buddies.length > 0) d.push(`buddies: ${rsv.buddies.length}`);
    if (rsv.comments) d.push('', 'Comment: ' + rsv.comments);
    if (rsv.category !== 'openwater')
        d.push(`until: ${rsv.endTime.substring(0, 5)}`);
    return d.join(',\n');
};

const upperFirst = (s: string) => s.length > 0 ? s[0].toUpperCase() + s.substring(1) : '';

const shortDateTime = (rsv: Reservation) => {
    const dt = dayjs(rsv.date + 'T' + rsv.startTime);
    if (dt.diff(dayjs(), 'hours') < 24) {
        return 'at Tomorrow❗️'
    }
    else return dt.format('DD/MMM hh:mm')
};

const reservationStatusIcon = (rsv: Reservation) => {
    switch (rsv.status) {
        case 'canceled':
            return getRandomElement('🙈', '🙀', '🐣', '😶', '🤧', '🤒');
        case 'confirmed':
            return '✅';
        case 'pending':
            return '⌛️';
        case 'rejected':
            return '❌';
        default:
            return '';
    }
}

const reservationCategoryIcon = (rsv: Reservation) => {
    switch (rsv.category) {
        case 'classroom':
            return getRandomElement('🧑‍🏫', '📚', '👩‍🏫', '👨‍🏫');
        case 'openwater':
            return getRandomElement('🌊', '🤿', '🪼', '🦀', '🐢', '🦈', '🐋', '🐙', '🦐', '🦑', '🦞', '🦦', '🦭', '🐡', '🐟', '🐠', '🐬', '🪸', '🐳', '🧜‍♀️', '🧜', '🧜‍♂️', '🦄');
        case 'pool':
            return '🏊‍♀️';
        default:
            return '';
    }
}