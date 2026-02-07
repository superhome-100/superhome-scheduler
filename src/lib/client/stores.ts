import { writable, readable, type Writable, type Readable } from 'svelte/store';
import { supabase_es, type EventType } from './supabase_event_source';
import { getYYYYMMDD, PanglaoDate } from '$lib/datetimeUtils';
import { defaultDateSettings, getDateSetting, type DateSetting } from '$lib/firestore';
import { getSettingsManager } from '$lib/settings';
import { type SettingsManager } from '$lib/settingsManager';
import { deepEqual } from '$lib/utils';
import type {
    Buoy,
    BuoyGroupings,
    DateReservationSummary,
    Notifications,
    RequireKeys,
    Reservation,
    SupabaseClient,
    UserEx,
    UserMinimal
} from '$types';
import {
    getBoatAssignmentsByDate,
    getBuoys,
    getIncomingReservations,
    getOWAdminComments,
    getReservationsByDate,
    getReservationSummary,
    getUserNotifications,
    getUserPastReservations,
    getUsers
} from '$lib/api';

type CoreStore = { supabase: SupabaseClient, user: UserEx | null };

export const coreStore = writable<CoreStore>(undefined);

export const isLoading = writable<boolean>(false);

const progressTracker = {
    _inProgress: 0,
    async track<T, P extends unknown[]>(cb: (...args: P) => Promise<T>, ...args: P): Promise<T> {
        if (this._inProgress++ == 0) isLoading.set(true);
        try {
            return await cb(...args);
        } finally {
            if (--this._inProgress == 0) isLoading.set(false);
        }
    }
};

type CoreStoreWithUser = RequireKeys<CoreStore, 'user'>;

function readableWithSubscriptionToCore<T>(
    defaultValue: T,
    cb: (cs: CoreStoreWithUser, prev: T) => Promise<T>,
    event: EventType, ...events: EventType[]
): Readable<T> {
    return readable<T>(defaultValue, (set) => {
        let coreParam: CoreStoreWithUser | undefined = undefined;
        let value: T = defaultValue;
        const safeCb = async () => {
            if (coreParam?.user) {
                await progressTracker.track(async (cp, v) => {
                    try {
                        value = await cb(cp, v);
                        set(value);
                    } catch (e) {
                        console.error('subscribeToCore', e);
                    }
                }, coreParam, value);
            }
        };
        const unsubCs = coreStore.subscribe(async (cpN: CoreStore) => {
            coreParam = cpN as CoreStoreWithUser;
            safeCb();
        });
        const unsubSupa = supabase_es.subscribe(safeCb, event, ...events);
        return () => {
            unsubCs();
            unsubSupa();
        }
    });
}

function readableWithSubscriptionToCoreAndParam<T, P>(
    defaultValue: T,
    paramStore: Writable<P>,
    cb: (cs: CoreStoreWithUser, param: P, prev: T) => Promise<T>,
    event: EventType, ...events: EventType[]
): Readable<T> {
    return readable<T>(defaultValue, (set) => {
        let coreParam: CoreStoreWithUser | undefined = undefined;
        let param: P | undefined = undefined;
        let value: T = defaultValue;
        const safeCb = async () => {
            if (coreParam?.user && param !== undefined) {
                await progressTracker.track(async (cp, p, v) => {
                    try {
                        value = await cb(cp, p, v);
                        set(value);
                    } catch (e) {
                        console.error('subscribeToCore', e);
                    }
                }, coreParam, param, value);
            }
        };
        const unsubCs = coreStore.subscribe(async (cpN: CoreStore) => {
            coreParam = cpN as CoreStoreWithUser;
            safeCb();
        });
        const unsubP = paramStore.subscribe(async (pN: P) => {
            const isEq = deepEqual(param, pN)
            if (!isEq) {
                param = pN;
                safeCb();
            }
        });
        const unsubSupa = supabase_es.subscribe(safeCb, event, ...events);
        return () => {
            unsubCs();
            unsubP();
            unsubSupa();
        }
    });
}

//

export const storedUser = readable<UserEx | null>(null, (set) => coreStore.subscribe((cs) => set(cs?.user)));

export const storedUsers =
    readableWithSubscriptionToCore<{ [uid: string]: UserMinimal }>({}, async ({ supabase }) => {
        const r = await getUsers(supabase);
        return r;
    }, "Users");

export const storedIncomingReservations =
    readableWithSubscriptionToCore<Reservation[]>([], async ({ supabase, user }) => {
        const r = await getIncomingReservations(user, supabase);
        return r;
    }, "Reservations");

export const storedPastReservations =
    readableWithSubscriptionToCore<Reservation[]>([], async ({ supabase, user }) => {
        const r = await getUserPastReservations(user, supabase, getYYYYMMDD(PanglaoDate())); // TODO:mate day passes
        return r;
    }, "Reservations");

export const storedDayReservations_param = writable<{ day: string }>();

export const storedDayReservations =
    readableWithSubscriptionToCoreAndParam<Reservation[], { day: string }>([],
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getReservationsByDate(supabase, day);
            return r;
        }, "Reservations");

export const storedDaySettings =
    readableWithSubscriptionToCoreAndParam<DateSetting, { day: string }>(defaultDateSettings,
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const [dateSettings] = await getDateSetting(supabase, day);
            return dateSettings;
        }, "DaySettings");

export const storedReservationsSummary_param = writable<{ startDay: Date, endDay: Date }>();

export const storedReservationsSummary =
    readableWithSubscriptionToCoreAndParam<Record<string, DateReservationSummary>, { startDay: Date, endDay: Date }>({},
        storedReservationsSummary_param,
        async ({ supabase }, { startDay, endDay }) => {
            const r = await getReservationSummary(supabase, startDay, endDay);
            return r;
        }, "Reservations", "DaySettings");

export const storedOWAdminComments =
    readableWithSubscriptionToCoreAndParam<BuoyGroupings[], { day: string }>([],
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getOWAdminComments(supabase, day);
            return r;
        }, "BuoyGroupings");

export const storedBuoys =
    readableWithSubscriptionToCore<Buoy[]>([],
        async ({ supabase }) => {
            const r = await getBuoys(supabase);
            return r;
        }, "Buoys");

export const storedBoatAssignments =
    readableWithSubscriptionToCoreAndParam<Record<string, string>, { day: string }>({},
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getBoatAssignmentsByDate(supabase, day);
            return r;
        }, "Boats");

export const storedNotifications =
    readableWithSubscriptionToCore<Notifications[]>([],
        async ({ supabase }) => {
            const r = await getUserNotifications(supabase);
            return r;
        }, "Notifications");

/**
 * set in src/routes/+layout.svelte and at change
 */
export const storedSettings = writable<SettingsManager>();
/**
 * use 'storedSettings' instead of this
 */
export const storedSettingsOnline =
    readableWithSubscriptionToCore<SettingsManager>(undefined as unknown as SettingsManager,
        async ({ supabase }) => {
            const r = await getSettingsManager(supabase);
            storedSettings.set(r); //hacky update but should be fine for now
            return r;
        }, "Settings");
