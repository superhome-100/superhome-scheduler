import { PUBLIC_VAPID_SUBJECT } from '$env/static/public';
import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import { supabaseServiceRole } from './supabase';
import webpush, { type PushSubscription } from 'web-push';
import type { Reservation, User } from '$types';
import { dayjs, fromPanglaoDateTimeStringToDayJs, getYYYYMMDD } from '$lib/datetimeUtils';
import { LRUCache } from 'lru-cache'
import type { Json } from '$lib/supabase.types';
import { getRandomElement } from '$lib/utils';
import { console_error } from './sentry';
import type { SettingsManager } from '$lib/settings';

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

export type BulkPushResut = {
    success: number;
    failure: Error[];
    message?: string;
};

export const pushNotificationService = {
    /**
     * Message will look like:
     * #1: <title>
     * #2: From Superhome
     * #3: <message>
     */
    async send(sm: SettingsManager, userId: string, title: string, message: string, url: string = '/'): Promise<BulkPushResut> {
        try {
            if (!sm.get('pushNotificationEnabled', getYYYYMMDD()))
                return { success: 0, failure: [], message: 'push setting is not enabled' };
            const pss = await this._getPushSubscriptions(userId);
            const uRes = await Promise.all(pss.map(d => {
                return (async (subscription) => {
                    const payload = JSON.stringify({
                        title,
                        body: message,
                        data: { url }
                    });
                    const resp = await webpush.sendNotification(subscription, payload);
                    console.info('push sent', { user: userId, session: d.sessionId }, resp);
                    return { success: 1, failure: [] as Error[] };
                })(d.pushSubscription as unknown as PushSubscription).catch((reason: unknown) => {
                    console_error(`couldn't send notification`, { user: userId, session: d.sessionId }, reason);
                    return { success: 0, failure: [reason as Error] };
                })
            }))
            return uRes.reduce<BulkPushResut>((prev, curr) => {
                prev.success += curr.success
                prev.failure.push(...curr.failure)
                return prev
            }, { success: 0, failure: [] as Error[] });
        } catch (e) {
            console_error("pushNotificationService.send", e)
            return { success: 0, failure: [e as Error] };
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

    async sendSafe(sm: SettingsManager, userId: string, title: string, message: string, url: string = '/') {
        try {
            return await this.send(sm, userId, title, message, url);
        } catch (e) {
            console_error("pushNotificationService.send", e)
        }
    },

    async _sendReservationFn(sm: SettingsManager, actor: User | null, rsvs: Reservation[], fn: (r: Reservation) => string) {
        await Promise.allSettled(rsvs
            .filter(r => r.user !== actor?.id)
            .map(async (rsv) => this.sendSafe(sm, rsv.user,
                reservationTitle(rsv, fn),
                reservationDetails(rsv),
                `/single-day/${rsv.category}/${rsv.date}`
            )))
    },

    async sendReservationStatus(sm: SettingsManager, actor: User, rsvs: Reservation[]) {
        await this._sendReservationFn(sm, actor, rsvs, r => r.status);
    },

    async sendReservationCreated(sm: SettingsManager, actor: User, rsvs: Reservation[]) {
        await this._sendReservationFn(sm, actor, rsvs, () => 'created');
    },

    async sendReservationModified(sm: SettingsManager, actor: User | null, rsvs: Reservation[]) {
        await this._sendReservationFn(sm, actor, rsvs, () => 'modified');
    }
};

const reservationTitle = (rsv: Reservation, fn: (r: Reservation) => string) => {
    return `${upperFirst(rsv.category)} ${shortDateTime(rsv)}: ${fn(rsv)}`
}

const reservationDetails = (rsv: Reservation) => {
    const d: string[] = [
        `${rsv.resType}: ${rsv.status}` + reservationStatusIcon(rsv)
    ];
    if (rsv.maxDepth) d.push(`depth: ${rsv.maxDepth}m`);
    if (rsv.numStudents) d.push(`students: ${rsv.numStudents}`);
    if (rsv.buddies.length > 0) d.push(`buddies: ${rsv.buddies.length}`);
    if (rsv.comments) d.push(`Comment: ${rsv.comments}`);
    if (rsv.category !== 'openwater')
        d.push(`until: ${rsv.endTime.substring(0, 5)}`);
    return d.join('\n');
};

const upperFirst = (s: string) => s.length > 0 ? s[0].toUpperCase() + s.substring(1) : '';

const shortDateTime = (rsv: Reservation) => {
    const rsvStart = fromPanglaoDateTimeStringToDayJs(rsv.date, rsv.startTime);
    const now = dayjs()
    if (rsvStart.isSame(now, 'day')) {
        return 'Today❗️' + rsvStart.format('HH:mm')
    }
    if (rsvStart.isSame(now.add(1, 'day'), 'day')) {
        return 'Tmrw❗️' + rsvStart.format('HH:mm')
    }
    return rsvStart.format('DD/MMM HH:mm')
};

const reservationStatusIcon = (rsv: Reservation) => {
    switch (rsv.status) {
        case 'canceled':
            return getRandomElement('🙈', '🙀', '🐣', '😶', '🤧', '🤒');
        case 'confirmed':
            return reservationCategoryIcon(rsv);
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