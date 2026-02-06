import type { Buoy, BuoyGroupings, DateReservationSummary, Notifications, RequireKeys, Reservation, SupabaseClient, UserEx, UserMinimal } from '$types';
import { writable, readable, type Writable } from 'svelte/store';
import { supabase_es, type EventType } from './supabase_event_source';
import { getBoatAssignmentsByDate, getBuoys, getIncomingReservations, getOWAdminComments, getReservationsByDate, getReservationSummary, getUserNotifications, getUserPastReservations, getUsers } from '$lib/api';
import { getYYYYMMDD, PanglaoDate } from '$lib/datetimeUtils';
import { defaultDateSettings, getDateSetting, type DateSetting } from '$lib/firestore';
import { getSettingsManager } from '$lib/settings';
import { type SettingsManager } from '$lib/settingsManager';

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

function subscribeCoreWithEvent<T>(
    set: (value: T) => void,
    cb: (cs: CoreStoreWithUser) => Promise<T>,
    event: EventType, ...events: EventType[]
): () => void {
    let core_param: CoreStoreWithUser | undefined = undefined;
    const safeCb = async () => {
        if (core_param?.user) {
            await progressTracker.track(async (cs) => {
                try {
                    const ret = await cb(cs);
                    set(ret);
                } catch (e) {
                    console.error('subscribeToCore', e);
                }
            }, core_param);
        }
    };
    const unsubCs = coreStore.subscribe(async (csN: CoreStore) => {
        core_param = csN as CoreStoreWithUser;
        safeCb();
    });
    const unsubSupa = supabase_es.subscribe(safeCb, event, ...events);
    return () => {
        unsubCs();
        unsubSupa();
    }
}

function subscribeCoreWithEventAndParam<T, P>(
    set: (value: T) => void,
    paramStore: Writable<P>,
    cb: (cs: CoreStoreWithUser, param: P) => Promise<T>,
    event: EventType, ...events: EventType[]
): () => void {
    let core_param: CoreStoreWithUser | undefined = undefined;
    let param: P | undefined = undefined
    const safeCb = async () => {
        if (core_param?.user && param !== undefined) {
            await progressTracker.track(async (cs, p) => {
                try {
                    const ret = await cb(cs, p);
                    set(ret);
                } catch (e) {
                    console.error('subscribeToCore', e);
                }
            }, core_param, param);
        }
    };
    const unsubCs = coreStore.subscribe(async (csN: CoreStore) => {
        core_param = csN as CoreStoreWithUser;
        safeCb();
    });
    const unsubP = paramStore.subscribe(async (pN: P) => {
        param = pN;
        safeCb();
    });
    const unsubSupa = supabase_es.subscribe(safeCb, event, ...events);
    return () => {
        unsubCs();
        unsubP();
        unsubSupa();
    }
}

//

export const storedUser = readable<UserEx | null>(null, (set) => coreStore.subscribe((cs) => set(cs?.user)));

export const storedUsers = readable<{ [uid: string]: UserMinimal }>({}, (set) => {
    return subscribeCoreWithEvent(set, async ({ supabase }) => {
        const r = await getUsers(supabase);
        return r;
    }, "Users");
});

export const storedIncomingReservations = readable<Reservation[]>([], (set) => {
    return subscribeCoreWithEvent(set, async ({ supabase, user }) => {
        const r = await getIncomingReservations(user, supabase);
        return r;
    }, "Reservations");
});

export const storedPastReservations = readable<Reservation[]>([], (set) => {
    return subscribeCoreWithEvent(set, async ({ supabase, user }) => {
        const r = await getUserPastReservations(user, supabase, getYYYYMMDD(PanglaoDate())); // TODO:mate day passes
        return r;
    }, "Reservations");
});

export const storedDayReservations_param = writable<{ day: string }>();

export const storedDayReservations = readable<Reservation[]>([], (set) => {
    return subscribeCoreWithEventAndParam(set, storedDayReservations_param, async ({ supabase }, { day }) => {
        const r = await getReservationsByDate(supabase, day);
        return r;
    }, "Reservations");
});

export const storedDaySettings = readable<DateSetting>(defaultDateSettings, (set) => {
    return subscribeCoreWithEventAndParam(set, storedDayReservations_param, async ({ supabase }, { day }) => {
        const [dateSettings] = await getDateSetting(supabase, day);
        return dateSettings;
    }, "DaySettings");
});

export const storedReservationsSummary_param = writable<{ startDay: Date, endDay: Date }>();

export const storedReservationsSummary = readable<Record<string, DateReservationSummary>>({}, (set) => {
    return subscribeCoreWithEventAndParam(set, storedReservationsSummary_param, async ({ supabase }, { startDay, endDay }) => {
        const r = await getReservationSummary(supabase, startDay, endDay);
        return r;
    }, "Reservations", "DaySettings");
});

export const storedOWAdminComments = readable<BuoyGroupings[]>([], (set) => {
    return subscribeCoreWithEventAndParam(set, storedDayReservations_param, async ({ supabase }, { day }) => {
        const r = await getOWAdminComments(supabase, day);
        return r;
    }, "BuoyGroupings");
});

export const storedBuoys = readable<Buoy[]>([], (set) => {
    return subscribeCoreWithEvent(set, async ({ supabase }) => {
        const r = await getBuoys(supabase);
        return r;
    }, "Buoys");
});

export const storedBoatAssignments = readable<Record<string, string>>({}, (set) => {
    return subscribeCoreWithEventAndParam(set, storedDayReservations_param, async ({ supabase }, { day }) => {
        const r = await getBoatAssignmentsByDate(supabase, day);
        return r;
    }, "Boats");
});


export const storedNotifications = readable<Notifications[]>([], (set) => {
    return subscribeCoreWithEvent(set, async ({ supabase }) => {
        const r = await getUserNotifications(supabase);
        return r;
    }, "Notifications");
});

export const storedSettings = writable<SettingsManager>();
export const storedSettingsOnline = readable<SettingsManager>(undefined, (set) => {
    return subscribeCoreWithEvent(set, async ({ supabase }) => {
        const r = await getSettingsManager(supabase);
        storedSettings.set(r); //hacky update but should be fine for now
        return r;
    }, "Settings");
});
