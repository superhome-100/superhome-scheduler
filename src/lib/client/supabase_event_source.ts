import debounce, { type Options } from "debounce-fn";
import type { Database } from '$lib/supabase.types'
import {
    SupabaseClient,
    REALTIME_SUBSCRIBE_STATES
} from '@supabase/supabase-js'
import { readable, writable, type Readable } from "svelte/store";

const EVENTS = [
    'Boats',
    'Buoys',
    'BuoyGroupings',
    'DaySettings',
    'Notifications',
    'Reservations',
    'Settings',
    'Users',
    'UserPriceTemplates',
    'PriceTemplates',
] as const;
export type EventType = typeof EVENTS[number];
type Payload = unknown
type Subscriber = () => void | Promise<void>
type Unsubscribe = () => void

const debounceShort: Options = {
    wait: 200,
    maxWait: 1000,
};
const debounceLong: Options = {
    wait: 1000,
    maxWait: 2000,
};
const EventConfig: Record<EventType, Options> = {
    'Boats': debounceShort,
    'Buoys': debounceShort,
    'BuoyGroupings': debounceShort,
    'DaySettings': debounceShort,
    'Notifications': debounceLong,
    'Reservations': debounceLong,
    'Settings': debounceShort,
    'Users': debounceShort,
    'UserPriceTemplates': debounceShort,
    'PriceTemplates': debounceShort,
}

let currentChannelId = 0;

export class SupabaseEventSource {
    private readonly _channelName = 'table_changes';
    private readonly subscribers = new Map<EventType, Set<Subscriber>>();
    private readonly _isOnline = writable<boolean>(false);

    private _channelStatus: REALTIME_SUBSCRIBE_STATES | undefined = undefined;
    private _client: SupabaseClient<Database> | undefined = undefined;
    private _checkInterval: ReturnType<typeof setInterval> | undefined = undefined;
    private _connectingP: Promise<void> | undefined = undefined;

    get isOnline(): Readable<boolean> {
        return this._isOnline;
    }

    constructor() {
        for (const event of EVENTS) {
            this.subscribers.set(event, new Set());
        }
    }

    async init(client: SupabaseClient<Database>, user: unknown): Promise<void> {
        console.debug('supabase_es.init', this._channelStatus, !!user);
        if (!user) {
            this.stopCheckInterval();
            return;
        }
        this._client = client;
        this._startCheckInterval();
        await this._connect();
    }

    private _startCheckInterval() {
        if (this._checkInterval) return;
        this._checkInterval = setInterval(() => this._connect(), 3000);
    }

    stopCheckInterval() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
            this._checkInterval = undefined;
        }
    }

    private async _connect() {
        if (!this._client) return;
        if (this._channelStatus === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) return;
        if (this._connectingP) return await this._connectingP;

        const client = this._client;
        this._connectingP = Promise.resolve()
            .then(async () => {
                console.debug('supabase_es._connect', this._channelStatus);
                await client.removeAllChannels().catch(e => console.error('supabase_es._connect.removeAllChannels', e));
                await client.realtime.setAuth();

                const channel = client.channel(this._channelName, {
                    config: { private: true }
                });

                const channelId = ++currentChannelId;

                for (const event of EVENTS) {
                    const fn = debounce((payload: Payload) => this._dispatch(event, payload), EventConfig[event]);
                    channel.on(
                        'broadcast',
                        { event },
                        payload => fn(payload)
                    );
                }

                const status = await new Promise<REALTIME_SUBSCRIBE_STATES>(resolve => {
                    channel.subscribe((status, err) => {
                        if (currentChannelId !== channelId) {
                            console.warn('ignoring supabase_es._connects.subscribe:', this._channelName, `${channelId}/${currentChannelId}`, status, err);
                            return;
                        }
                        console.log('supabase_es._connect.subscribe:', this._channelName, `${channelId}/${currentChannelId}`, status, err);
                        this._channelStatus = status;
                        this._isOnline.set(status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
                        resolve(status);
                    }, 2000);
                });

                if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED)
                    await client.removeAllChannels().catch(e => console.error('supabase_es._connect.removeAllChannels', status, e));
            })
            .catch(e => console.error('supabase_es._connect', e));

        await this._connectingP;
        this._connectingP = undefined
    }

    async checkAndStartInterval() {
        this._startCheckInterval()
        await this._connect();
    }

    async destroy() {
        console.debug('supabase_es.destroy', this._channelStatus);
        this.stopCheckInterval();
        if (this._client)
            await this._client.removeAllChannels();
        this._client = undefined;
        this._channelStatus = undefined;
    }

    subscribe(fn: Subscriber, ...event: EventType[]): Unsubscribe {
        const sets: Set<Subscriber>[] = event.map(e => {
            const set = this.subscribers.get(e)!;
            set.add(fn);
            return set;
        });
        return () => {
            sets.forEach(s => s.delete(fn));
        };
    }

    notifyAll() {
        console.debug('supabase_es.notifyAll');
        for (const e of this.subscribers.keys()) {
            this._dispatch(e, undefined);
        }
    }

    notify(...events: EventType[]) {
        for (const e of events) {
            this._dispatch(e, undefined);
        }
    }

    private _dispatch(event: EventType, payload: Payload | undefined) {
        for (const fn of this.subscribers.get(event)!) {
            Promise.resolve().then(fn).catch(e => console.error("SupabaseEventSource subscriber error", event, e, payload));
        }
    }
}

export const supabase_es = new SupabaseEventSource()
export const supabaseIsOnline = readable<boolean>(false, (set) => {
    supabase_es.isOnline.subscribe(set);
});
