import debounce, { type Options } from "debounce-fn";
import type { Database } from '$lib/supabase.types'
import {
    SupabaseClient,
    RealtimeChannel,
    REALTIME_CHANNEL_STATES,
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

let _channelId = 0;

export class SupabaseEventSource {
    private readonly _channelName = 'table_changes';
    private channel: RealtimeChannel | null = null;
    private readonly subscribers = new Map<EventType, Set<Subscriber>>()
    private _channelStatus: REALTIME_SUBSCRIBE_STATES | undefined = undefined;
    private _channelId: number | undefined = undefined;
    private readonly _isOnline = writable<boolean>(false);

    get isOnline(): Readable<boolean> {
        return this._isOnline;
    }

    async init(client: SupabaseClient<Database>, user: unknown): Promise<void> {
        console.debug('supabase_es.init', this.channel?.state, !!user);
        if (!user) return;
        if (this.channel) {
            if (this.channel.state === REALTIME_CHANNEL_STATES.joined
                || this.channel.state === REALTIME_CHANNEL_STATES.joining) {
                return;
            }
            this._isOnline.set(false);
            await this.channel.unsubscribe();
            await client.removeChannel(this.channel).catch(e => console.error('supabase_es.removeChannel', e));
        }
        await client.realtime.setAuth(); // Needed for Realtime Authorization
        this.channel = client.channel(this._channelName, {
            config: { private: true }
        });
        const channelId = _channelId++;
        this._channelId = channelId;
        for (const event of EVENTS) {
            const fn = debounce((payload: Payload) => this.dispatch(event, payload), EventConfig[event])
            this.channel.on(
                'broadcast',
                { event },
                payload => fn(payload)
            )
        }
        const subscribe = (resolve: (status: REALTIME_SUBSCRIBE_STATES) => void) => {
            this.channel!.subscribe((status, err) => {
                if (this._channelId !== channelId) {
                    console.log('ignoring supabase_es.channel.subscribe:', this._channelId, channelId, this._channelName, this._channelStatus, status, err);
                    return;
                }
                console.log('supabase_es.channel.subscribe:', channelId, this._channelName, this._channelStatus, status, err);
                this._channelStatus = status;
                this._isOnline.set(status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
                resolve(status);
            }, 2000);
        }
        const status = await new Promise(subscribe);
        if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
            console.debug('supabase_es.init', status, 'retry');
            await new Promise(subscribe);
        }
    }

    async destroy(client: SupabaseClient<Database>) {
        if (this.channel) {
            const channel = this.channel;
            this.channel = null;
            await client.removeChannel(channel);
        }
    }

    constructor() {
        for (const event of EVENTS) {
            this.subscribers.set(event, new Set())
        }
    }

    subscribe(fn: Subscriber, ...event: EventType[]): Unsubscribe {
        const sets: Set<Subscriber>[] = event.map(e => {
            const set = this.subscribers.get(e)!
            set.add(fn)
            return set
        });
        return () => {
            sets.forEach(s => s.delete(fn))
        }
    }

    notifyAll() {
        console.debug('supabase_es.notifyAll');
        for (const e of this.subscribers.keys()) {
            this.dispatch(e, undefined)
        }
    }

    notify(...events: EventType[]) {
        for (const e of events) {
            this.dispatch(e, undefined);
        }
    }

    private dispatch(event: EventType, payload: Payload | undefined) {
        for (const fn of this.subscribers.get(event)!) {
            Promise.resolve().then(fn).catch(e => console.error("SupabaseEventSource subscriber error", event, e, payload))
        }
    }
}

export const supabase_es = new SupabaseEventSource()
export const supabaseIsOnline = readable<boolean>(false, (set) => {
    supabase_es.isOnline.subscribe(set);
});
