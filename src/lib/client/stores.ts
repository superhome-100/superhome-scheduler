import { writable, readable, type Readable } from 'svelte/store';
import { supabase_es, type EventType } from './supabase_event_source';
import { getYYYYMMDD, PanglaoDate } from '$lib/datetimeUtils';
import { defaultDateSettings, getDaySettings, type DaySettings } from '$lib/dateSettings';
import { fallbackSettingsManager, getSettingsManager, type SettingsManager } from '$lib/settings';
import {
    ReservationStatus,
    type Buoy,
    type BuoyGroupings,
    type DateReservationSummary,
    type Notifications,
    type PriceTemplate,
    type RequireKeys,
    type ReservationEx,
    type SupabaseClient,
    type UserEx,
    type UserMinimal,
    type UserWithPriceTemplate
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
    getUsers,
    getUsersForAdmin,
} from '$lib/client/api';
import { LRUCache } from 'lru-cache';
import { stableStringify } from '$lib/utils';

export type CoreStore = { supabase: SupabaseClient, user: UserEx | null };

export const storedCore_params: Readable<CoreStore> = writable();

const isLoading_ = writable<boolean>(false);
export const isLoading: Readable<boolean> = isLoading_;

const progressTracker = {
    _inProgress: 0,
    async track<T, P extends unknown[]>(cb: (...args: P) => Promise<T>, ...args: P): Promise<T> {
        if (this._inProgress++ == 0) isLoading_.set(true);
        try {
            return await cb(...args);
        } finally {
            if (--this._inProgress == 0) isLoading_.set(false);
        }
    }
};

type CoreStoreWithUser = RequireKeys<CoreStore, 'user'>;
const nullVal = Symbol('nullVal');

function readableWithSubscriptionToCoreAndParam<T extends object | null, P>(
    variableName: string,
    defaultValue: T,
    setDefaultWhenLoading: boolean,
    paramStore: Readable<P>,
    cb: (cs: CoreStoreWithUser, param: P) => Promise<T>,
    event: EventType, ...events: EventType[]
): { value: Readable<T>, isLoading: Readable<boolean>, markAs: (as: 'modified' | 'refresh if offline') => void } {
    const cache = new LRUCache<string, NonNullable<T> | typeof nullVal>({ max: 50 });
    supabase_es.subscribe(() => {
        cache.clear();
    }, event, ...events);
    let coreParam: CoreStoreWithUser | undefined = undefined;
    let param: P | undefined = undefined;
    let paramJsn: string | undefined = undefined;
    //
    let markedAsDirtyAt = new Date(0);
    let updatedAt = new Date(0);
    let loadQueue = Promise.resolve();
    let dirtyTimer = Promise.resolve();
    let safeCb: (trigger: 'param' | 'core' | 'supa' | 'assumed') => Promise<void>;
    //
    const isLoading = writable<boolean>(false);
    const value = writable<T>(defaultValue, (set) => {
        safeCb = async (trigger: 'param' | 'core' | 'supa' | 'assumed') => {
            if (!coreParam?.user || param === undefined) return;
            if (trigger !== 'param' && markedAsDirtyAt < updatedAt) return;

            const cacheVal = cache.get(paramJsn!);
            if (cacheVal !== undefined) {
                console.debug('store.refresh.from-cache', variableName, param);
                if (cacheVal === nullVal) set(null as T);
                else set(cacheVal)
            } else {
                await progressTracker.track(async (cp, p, pJ, updateAtVal) => {
                    try {
                        console.debug('store.refresh', variableName, param);
                        isLoading.set(true);
                        const valueP = cb(cp, p);
                        // why only for 'param': because this means that the current value is not relate to the param
                        // other cases we can show the previous value until we have something new to show
                        if (setDefaultWhenLoading === true && trigger === 'param') {
                            set(defaultValue);
                        }
                        const value = await valueP;
                        cache.set(pJ, value ?? nullVal);
                        // console.debug('store.refreshed', variableName, param);
                        set(value);
                        updatedAt = updateAtVal;
                        isLoading.set(false);
                    } catch (e) {
                        console.error('subscribeToCoreAndParam', variableName, e, param);
                    }
                }, coreParam, param, paramJsn!, new Date());
            }

        };
        let isInit = true;
        const markAsDirty = (trigger: 'param' | 'core' | 'supa') => {
            markedAsDirtyAt = new Date();
            loadQueue = loadQueue.then(() => safeCb(trigger));
        }
        const unsubCs = storedCore_params.subscribe(async (cpN: CoreStore) => {
            if (coreParam !== cpN) {
                coreParam = cpN as CoreStoreWithUser;
                cache.clear();
                if (isInit) return;
                markAsDirty('core');
            }
        });
        const unsubP = paramStore.subscribe(async (pN: P) => {
            param = pN;
            const paramJsnN = stableStringify(pN);
            if (paramJsn !== paramJsnN) {
                paramJsn = paramJsnN;
                if (isInit) return;
                loadQueue = loadQueue.then(() => safeCb('param'));
            }
        });
        const unsubSupa = supabase_es.subscribe(() => {
            cache.clear();
            markAsDirty('supa');
        }, event, ...events);
        isInit = false;
        markAsDirty('core');
        return () => {
            // console.debug("store.unsub", variableName);
            unsubCs();
            unsubP();
            unsubSupa();
        }
    });
    const markAs = (as: 'modified' | 'refresh if offline') => {
        const isOnline = supabase_es.isOnlineVal;
        if (as === 'modified' || (as === 'refresh if offline' && !isOnline)) {
            markedAsDirtyAt = new Date();
            cache.clear();
            dirtyTimer = dirtyTimer
                .then(() => new Promise(r => setTimeout(r, isOnline ? 5000 : 500)))
                .then(() => loadQueue = loadQueue.then(() => safeCb("assumed")));
        }
    };
    return { isLoading, value, markAs };
}

const neverChangingParam = readable({});

function readableWithSubscriptionToCore<T extends object | null>(
    variableName: string,
    defaultValue: T,
    cb: (cs: CoreStoreWithUser) => Promise<T>,
    event: EventType, ...events: EventType[]
) {
    return readableWithSubscriptionToCoreAndParam<T, object>(variableName, defaultValue, false, neverChangingParam, cb, event, ...events);
}

//

/**
 * set in src/routes/+layout.svelte
 */
export const { value: storedSettings, isLoading: storedSettingsLoading } =
    readableWithSubscriptionToCore<SettingsManager>('storedSettings',
        fallbackSettingsManager,
        async ({ supabase }) => {
            const r = await getSettingsManager(supabase);
            return r;
        }, "Settings");

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

export const { value: storedUser } =
    readableWithSubscriptionToCore<UserEx | null>('storedUser',
        null, async ({ supabase, user }) => {
            const { data: u } = await supabase
                .from('Users')
                .select('*')
                .eq('id', user.id)
                .single()
                .throwOnError();
            if (u.updatedAt > user.updatedAt)
                return { ...user, ...u };
            else return user;
        }, "Users");


export const { value: storedUsers, isLoading: storedUsersLoading } =
    readableWithSubscriptionToCore<{ [uid: string]: UserMinimal }>('storedUsers',
        {}, async ({ supabase }) => {
            const r = await getUsers(supabase);
            return r;
        }, "Users");

export const { value: storedUsersForAdmin, isLoading: storedUsersForAdminLoading } =
    readableWithSubscriptionToCore<UserWithPriceTemplate[]>('storedUsers',
        [], async ({ supabase }) => {
            const r = await getUsersForAdmin(supabase);
            return r;
        }, "Users", "UserPriceTemplates");

export const { value: storedPriceTemplates } =
    readableWithSubscriptionToCore<PriceTemplate[]>('storedUsers',
        [], async ({ supabase }) => {
            const { data } = await supabase
                .from('PriceTemplates')
                .select("*")
                .order("id")
                .throwOnError();
            return data;
        }, "PriceTemplates");

export const { value: storedIncomingReservations, isLoading: storedIncomingReservationsLoading, markAs: storedIncomingReservationsMarkAs } =
    readableWithSubscriptionToCore<ReservationEx[]>('storedIncomingReservations',
        [], async ({ supabase, user }) => {
            const r = await getIncomingReservations(user, supabase);
            return r;
        }, "Reservations", "Users");

export const { value: storedPastReservations, isLoading: storedPastReservationsLoading, markAs: storedPastReservationsMarkAs } =
    readableWithSubscriptionToCoreAndParam<ReservationEx[], string>('storedPastReservations',
        [], true,
        storedCurrentDay,
        async ({ supabase, user }, currentDay) => {
            const r = await getUserPastReservations(user, supabase, currentDay);
            return r;
        }, "Reservations", "Users");

export const storedDayReservations_param = writable<{ day: string }>();

export const { value: storedDayReservationsAll, isLoading: storedDayReservationsAllLoading, markAs: storedDayReservationsAllMarkAs } =
    readableWithSubscriptionToCoreAndParam<ReservationEx[], { day: string }>('storedDayReservations',
        [], true,
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getReservationsByDate(supabase, day);
            return r;
        }, "Reservations", "Users");

export const storedDayReservationsLoading = storedDayReservationsAllLoading;
export const storedDayReservations =
    readable<ReservationEx[]>([], (set) => {
        return storedDayReservationsAll.subscribe(rs => {
            const rsf = rs.filter(r => [ReservationStatus.confirmed, ReservationStatus.pending].includes(r.status as ReservationStatus));
            set(rsf);
        });
    });

export const { value: storedDaySettings, isLoading: storedDaySettingsLoading, markAs: storedDaySettingsMarkAs } =
    readableWithSubscriptionToCoreAndParam<DaySettings, { day: string }>('storedDaySettings',
        defaultDateSettings, true,
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const dateSettings = await getDaySettings(supabase, day);
            return dateSettings;
        }, "DaySettings");

export const storedReservationsSummary_param = writable<{ startDay: Date, endDay: Date }>();

export const { value: storedReservationsSummary, isLoading: storedReservationsSummaryLoading, markAs: storedReservationsSummaryMarkAs } =
    readableWithSubscriptionToCoreAndParam<Record<string, DateReservationSummary>, { startDay: Date, endDay: Date }>('storedReservationsSummary',
        {}, true,
        storedReservationsSummary_param,
        async ({ supabase }, { startDay, endDay }) => {
            const r = await getReservationSummary(supabase, startDay, endDay);
            return r;
        }, "Reservations", "DaySettings");

export const { value: storedOWAdminComments, isLoading: storedOWAdminCommentsLoading, markAs: storedOWAdminCommentsMarkAs } =
    readableWithSubscriptionToCoreAndParam<BuoyGroupings[], { day: string }>('storedOWAdminComments',
        [], true,
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getOWAdminComments(supabase, day);
            return r;
        }, "BuoyGroupings");

export const { value: storedBuoys, isLoading: storedBuoysLoading, markAs: storedBuoysMarkAs } =
    readableWithSubscriptionToCore<Buoy[]>('storedBuoys',
        [],
        async ({ supabase }) => {
            const r = await getBuoys(supabase);
            return r;
        }, "Buoys");

export const { value: storedBoatAssignments, isLoading: storedBoatAssignmentsLoading, markAs: storedBoatAssignmentsMarkAs } =
    readableWithSubscriptionToCoreAndParam<Record<string, string>, { day: string }>('storedBoatAssignments',
        {}, true,
        storedDayReservations_param,
        async ({ supabase }, { day }) => {
            const r = await getBoatAssignmentsByDate(supabase, day);
            return r;
        }, "Boats");

export const { value: storedNotifications, isLoading: storedNotificationsLoading, markAs: storedNotificationsMarkAs } =
    readableWithSubscriptionToCore<Notifications[]>('storedNotifications',
        [],
        async ({ supabase }) => {
            const r = await getUserNotifications(supabase);
            return r;
        }, "Notifications");


export const reservationsMarkAs = (as: 'modified' | 'refresh if offline') => {
    storedReservationsSummaryMarkAs(as);
    storedDayReservationsAllMarkAs(as);
    storedIncomingReservationsMarkAs(as);
    storedPastReservationsMarkAs(as);
};