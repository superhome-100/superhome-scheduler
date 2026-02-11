import { writable, readable, type Readable } from 'svelte/store';
import { supabase_es, type EventType } from './supabase_event_source';
import { getYYYYMMDD, PanglaoDate } from '$lib/datetimeUtils';
import { defaultDateSettings, getDateSetting, type DateSetting } from '$lib/dateSettings';
import { getSettingsManager } from '$lib/settings';
import { type SettingsManager } from '$lib/settingsManager';
import type {
    Buoy,
    BuoyGroupings,
    DateReservationSummary,
    Notifications,
    RequireKeys,
    Reservation,
    ReservationEx,
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
import { LRUCache } from 'lru-cache';
import { stableStringify } from '$lib/utils';

/**
 * use 'storedAppVisibility' instead of this
 */
export const storedAppVisibilityW = writable<DocumentVisibilityState>();
export const storedAppVisibility = storedAppVisibilityW as Readable<DocumentVisibilityState>

type CoreStore = { supabase: SupabaseClient, user: UserEx | null };

/**
 * use 'storedCore_params' instead of this
 */
export const storedCore_paramsW = writable<CoreStore>(undefined);
export const storedCore_params = storedCore_paramsW as Readable<CoreStore>;

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
    variableName: string,
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
                        console.debug('refreshing store', variableName);
                        value = await cb(cp, v);
                        set(value);
                    } catch (e) {
                        console.error('subscribeToCore', variableName, e);
                    }
                }, coreParam, value);
            }
        };
        const unsubCs = storedCore_params.subscribe(async (cpN: CoreStore) => {
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

function readableWithSubscriptionToCoreAndParam<T extends object, P>(
    variableName: string,
    defaultValue: T,
    paramStore: Readable<P>,
    cb: (cs: CoreStoreWithUser, param: P, prev: T) => Promise<T>,
    event: EventType, ...events: EventType[]
): Readable<T> {
    return readable<T>(defaultValue, (set) => {
        const cache = new LRUCache<string, T>({ max: 50 });
        let coreParam: CoreStoreWithUser | undefined = undefined;
        let param: P | undefined = undefined;
        let paramJsn: string | undefined = undefined;
        let value: T = defaultValue;
        const safeCb = async () => {
            if (coreParam?.user && param !== undefined) {
                const cacheVal = cache.get(paramJsn!);
                if (cacheVal !== undefined) {
                    value = cacheVal;
                    set(value);
                } else {
                    await progressTracker.track(async (cp, p, v) => {
                        try {
                            console.debug('refreshing store', variableName);
                            value = await cb(cp, p, v);
                            cache.set(paramJsn!, value);
                            set(value);
                        } catch (e) {
                            console.error('subscribeToCoreAndParam', variableName, e, param);
                        }
                    }, coreParam, param, value);
                }
            }
        };
        const unsubCs = storedCore_params.subscribe(async (cpN: CoreStore) => {
            coreParam = cpN as CoreStoreWithUser;
            cache.clear();
            safeCb();
        });
        const unsubP = paramStore.subscribe(async (pN: P) => {
            param = pN;
            const paramJsnN = stableStringify(pN);
            if (paramJsn !== paramJsnN) {
                paramJsn = paramJsnN;
                safeCb();
            }
        });
        const unsubSupa = supabase_es.subscribe(() => {
            cache.clear();
            safeCb()
        }, event, ...events);
        return () => {
            unsubCs();
            unsubP();
            unsubSupa();
        }
    });
}

//

/**
 * refreshes in every minute
 */
export const storedCurrentDay = readable<string>(getYYYYMMDD(PanglaoDate()), (set) => {
    const iid = setInterval(() => {
        // no need for change detection, svelte can do it because it is a plain string
        set(getYYYYMMDD(PanglaoDate()));
    }, 60 * 1000);
    return () => clearInterval(iid);
});

export const storedUser = readable<UserEx | null>(null, (set) => storedCore_params.subscribe((cs) => set(cs?.user)));

export const storedUsers =
    readableWithSubscriptionToCore<{ [uid: string]: UserMinimal }>('storedUsers',
        {}, async ({ supabase }) => {
            const r = await getUsers(supabase);
            return r;
        }, "Users");

export const storedIncomingReservations =
    readableWithSubscriptionToCore<ReservationEx[]>('storedIncomingReservations',
        [], async ({ supabase, user }) => {
            const r = await getIncomingReservations(user, supabase);
            return r;
        }, "Reservations");

export const storedPastReservations =
    readableWithSubscriptionToCoreAndParam<ReservationEx[], string>('storedPastReservations',
        [],
        storedCurrentDay,
        async ({ supabase, user }, currentDay) => {
            const r = await getUserPastReservations(user, supabase, currentDay);
            return r;
        }, "Reservations");

export const storedDayReservations_param = writable<{ day: string }>();

export const storedDayReservations =
    readableWithSubscriptionToCoreAndParam<ReservationEx[], { day: string }>('storedDayReservations',
        [],
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getReservationsByDate(supabase, day);
            return r;
        }, "Reservations");

export const storedDaySettings =
    readableWithSubscriptionToCoreAndParam<DateSetting, { day: string }>('storedDaySettings',
        defaultDateSettings,
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const [dateSettings] = await getDateSetting(supabase, day);
            return dateSettings;
        }, "DaySettings");

export const storedReservationsSummary_param = writable<{ startDay: Date, endDay: Date }>();

export const storedReservationsSummary =
    readableWithSubscriptionToCoreAndParam<Record<string, DateReservationSummary>, { startDay: Date, endDay: Date }>('storedReservationsSummary',
        {},
        storedReservationsSummary_param,
        async ({ supabase }, { startDay, endDay }) => {
            const r = await getReservationSummary(supabase, startDay, endDay);
            return r;
        }, "Reservations", "DaySettings");

export const storedOWAdminComments =
    readableWithSubscriptionToCoreAndParam<BuoyGroupings[], { day: string }>('storedOWAdminComments',
        [],
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getOWAdminComments(supabase, day);
            return r;
        }, "BuoyGroupings");

export const storedBuoys =
    readableWithSubscriptionToCore<Buoy[]>('storedBuoys',
        [],
        async ({ supabase }) => {
            const r = await getBuoys(supabase);
            return r;
        }, "Buoys");

export const storedBoatAssignments =
    readableWithSubscriptionToCoreAndParam<Record<string, string>, { day: string }>('storedBoatAssignments',
        {},
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getBoatAssignmentsByDate(supabase, day);
            return r;
        }, "Boats");

export const storedNotifications =
    readableWithSubscriptionToCore<Notifications[]>('storedNotifications',
        [],
        async ({ supabase }) => {
            const r = await getUserNotifications(supabase);
            return r;
        }, "Notifications");

/**
 * set in src/routes/+layout.svelte and at change, don't use it
 */
export const storedSettingsW = writable<SettingsManager>();
export const storedSettings = storedSettingsW as Readable<SettingsManager>;
/**
 * use 'storedSettings' instead of this
 */
export const storedSettingsOnline =
    readableWithSubscriptionToCore<SettingsManager>('storedSettingsOnline',
        undefined as unknown as SettingsManager,
        async ({ supabase }) => {
            const r = await getSettingsManager(supabase);
            storedSettingsW.set(r); //hacky update but should be fine for now
            return r;
        }, "Settings");
