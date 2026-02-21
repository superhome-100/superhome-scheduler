import { writable, readable, type Readable } from 'svelte/store';
import { supabase_es, type EventType } from './supabase_event_source';
import { getYYYYMMDD, PanglaoDate } from '$lib/datetimeUtils';
import { defaultDateSettings, getDateSetting, type DateSetting } from '$lib/dateSettings';
import { getSettingsManager, type SettingsManager } from '$lib/settings';
import type {
    Buoy,
    BuoyGroupings,
    DateReservationSummary,
    Notifications,
    RequireKeys,
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
} from '$lib/client/api';
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
    cb: (cs: CoreStoreWithUser) => Promise<T>,
    event: EventType, ...events: EventType[]
): { value: Readable<T>, isLoading: Readable<boolean> } {
    let cacheVal: T | undefined = undefined;
    supabase_es.subscribe(() => {
        cacheVal = undefined;
    }, event, ...events);
    let coreParam: CoreStoreWithUser | undefined = undefined;
    const isLoading = writable<boolean>(false);
    const value = readable<T>(defaultValue, (set) => {
        const safeCb = async () => {
            if (coreParam?.user) {
                if (cacheVal !== undefined) {
                    console.debug('store.refresh.from-cache', variableName);
                    set(cacheVal);
                } else {
                    await progressTracker.track(async (cp) => {
                        try {
                            console.debug('store.refresh', variableName);
                            isLoading.set(true);
			    set(defaultValue);
                            cacheVal = await cb(cp);
                            set(cacheVal);
                            isLoading.set(false);
                        } catch (e) {
                            console.error('store.error', variableName, e);
                        }
                    }, coreParam);
                }
            }
        };
        let isInit = true;
        const unsubCs = storedCore_params.subscribe(async (cpN: CoreStore) => {
            if (coreParam !== cpN) {
                coreParam = cpN as CoreStoreWithUser;
                cacheVal = undefined;
                if (!isInit)
                    safeCb();
            }
        });
        const unsubSupa = supabase_es.subscribe(() => {
            cacheVal = undefined;
            safeCb();
        }, event, ...events);
        safeCb();
        isInit = false;
        return () => {
            console.log("store.unsub", variableName)
            unsubCs();
            unsubSupa();
        }
    });
    return { isLoading, value };
}

function readableWithSubscriptionToCoreAndParam<T extends object, P>(
    variableName: string,
    defaultValue: T,
    paramStore: Readable<P>,
    cb: (cs: CoreStoreWithUser, param: P) => Promise<T>,
    event: EventType, ...events: EventType[]
): { value: Readable<T>, isLoading: Readable<boolean> } {
    const cache = new LRUCache<string, T>({ max: 50 });
    supabase_es.subscribe(() => {
        cache.clear();
    }, event, ...events);
    let coreParam: CoreStoreWithUser | undefined = undefined;
    let param: P | undefined = undefined;
    let paramJsn: string | undefined = undefined;
    const isLoading = writable<boolean>(false);
    const value = readable<T>(defaultValue, (set) => {
        const safeCb = async () => {
            if (coreParam?.user && param !== undefined) {
                const cacheVal = cache.get(paramJsn!);
                if (cacheVal !== undefined) {
                    console.debug('store.refresh.from-cache', variableName, param);
                    set(cacheVal);
                } else {
                    await progressTracker.track(async (cp, p) => {
                        try {
                            console.debug('store.refresh', variableName, param);
                            isLoading.set(true);
			    set(defaultValue);
                            const value = await cb(cp, p);
                            cache.set(paramJsn!, value);
                            set(value);
                            isLoading.set(false);
                        } catch (e) {
                            console.error('subscribeToCoreAndParam', variableName, e, param);
                        }
                    }, coreParam, param);
                }
            }
        };
        let isInit = true;
        const unsubCs = storedCore_params.subscribe(async (cpN: CoreStore) => {
            if (coreParam !== cpN) {
                coreParam = cpN as CoreStoreWithUser;
                cache.clear();
                if (!isInit)
                    safeCb();
            }
        });
        const unsubP = paramStore.subscribe(async (pN: P) => {
            param = pN;
            const paramJsnN = stableStringify(pN);
            if (paramJsn !== paramJsnN) {
                paramJsn = paramJsnN;
                if (!isInit)
                    safeCb();
            }
        });
        const unsubSupa = supabase_es.subscribe(() => {
            cache.clear();
            safeCb()
        }, event, ...events);
        safeCb();
        isInit = false;
        return () => {
            console.log("store.unsub", variableName);
            unsubCs();
            unsubP();
            unsubSupa();
        }
    });
    return { isLoading, value };
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

export const { value: storedUsers, isLoading: storedUsersLoading } =
    readableWithSubscriptionToCore<{ [uid: string]: UserMinimal }>('storedUsers',
        {}, async ({ supabase }) => {
            const r = await getUsers(supabase);
            return r;
        }, "Users");

export const { value: storedIncomingReservations, isLoading: storedIncomingReservationsLoading } =
    readableWithSubscriptionToCore<ReservationEx[]>('storedIncomingReservations',
        [], async ({ supabase, user }) => {
            const r = await getIncomingReservations(user, supabase);
            return r;
        }, "Reservations");

export const { value: storedPastReservations, isLoading: storedPastReservationsLoading } =
    readableWithSubscriptionToCoreAndParam<ReservationEx[], string>('storedPastReservations',
        [],
        storedCurrentDay,
        async ({ supabase, user }, currentDay) => {
            const r = await getUserPastReservations(user, supabase, currentDay);
            return r;
        }, "Reservations");

export const storedDayReservations_param = writable<{ day: string }>();

export const { value: storedDayReservations, isLoading: storedDayReservationsLoading } =
    readableWithSubscriptionToCoreAndParam<ReservationEx[], { day: string }>('storedDayReservations',
        [],
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getReservationsByDate(supabase, day);
            return r;
        }, "Reservations");

export const { value: storedDaySettings, isLoading: storedDaySettingsLoading } =
    readableWithSubscriptionToCoreAndParam<DateSetting, { day: string }>('storedDaySettings',
        defaultDateSettings,
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const [dateSettings] = await getDateSetting(supabase, day);
            return dateSettings;
        }, "DaySettings");

export const storedReservationsSummary_param = writable<{ startDay: Date, endDay: Date }>();

export const { value: storedReservationsSummary, isLoading: storedReservationsSummaryLoading } =
    readableWithSubscriptionToCoreAndParam<Record<string, DateReservationSummary>, { startDay: Date, endDay: Date }>('storedReservationsSummary',
        {},
        storedReservationsSummary_param,
        async ({ supabase }, { startDay, endDay }) => {
            const r = await getReservationSummary(supabase, startDay, endDay);
            return r;
        }, "Reservations", "DaySettings");

export const { value: storedOWAdminComments, isLoading: storedOWAdminCommentsLoading } =
    readableWithSubscriptionToCoreAndParam<BuoyGroupings[], { day: string }>('storedOWAdminComments',
        [],
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getOWAdminComments(supabase, day);
            return r;
        }, "BuoyGroupings");

export const { value: storedBuoys, isLoading: storedBuoysLoading } =
    readableWithSubscriptionToCore<Buoy[]>('storedBuoys',
        [],
        async ({ supabase }) => {
            const r = await getBuoys(supabase);
            return r;
        }, "Buoys");

export const { value: storedBoatAssignments, isLoading: storedBoatAssignmentsLoading } =
    readableWithSubscriptionToCoreAndParam<Record<string, string>, { day: string }>('storedBoatAssignments',
        {},
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getBoatAssignmentsByDate(supabase, day);
            return r;
        }, "Boats");

export const { value: storedNotifications, isLoading: storedNotificationsLoading } =
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
 * has to be used in src/routes/+layout.svelte to has a constant store subscription
 */
export const { value: storedSettingsOnline, isLoading: storedSettingsOnlineLoading } =
    readableWithSubscriptionToCore<SettingsManager>('storedSettingsOnline',
        undefined as unknown as SettingsManager,
        async ({ supabase }) => {
            const r = await getSettingsManager(supabase);
            storedSettingsW.set(r); //hacky update but should be fine for now
            return r;
        }, "Settings");
