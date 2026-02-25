import debounce, { type Options } from "debounce-fn";
import type { Database } from '$lib/supabase.types'
import {
    SupabaseClient,
    RealtimeChannel,
    REALTIME_CHANNEL_STATES,
    REALTIME_SUBSCRIBE_STATES
} from '@supabase/supabase-js'

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

export class SupabaseEventSource {
    private readonly _channelName = 'table_changes';
    private channel: RealtimeChannel | null = null;
    private readonly subscribers = new Map<EventType, Set<Subscriber>>()
    private _channelStatus: REALTIME_SUBSCRIBE_STATES | undefined = undefined;

    get channelStatus(): REALTIME_SUBSCRIBE_STATES | undefined {
        return this._channelStatus;
    }

    /**
     * @returns `true` if reconnected, `false` otherwise
     */
    async init(client: SupabaseClient<Database>) {
        if (this.channel) {
            if (this.channel.state === REALTIME_CHANNEL_STATES.joined
                || this.channel.state === REALTIME_CHANNEL_STATES.joining) {
                return false;
            }
            await client.removeChannel(this.channel);
        }
        await client.realtime.setAuth(); // Needed for Realtime Authorization
        this.channel = client.channel(this._channelName, {
            config: { private: true }
        })
        for (const event of EVENTS) {
            const fn = debounce((payload: Payload) => this.dispatch(event, payload), EventConfig[event])
            this.channel.on(
                'broadcast',
                { event },
                payload => fn(payload)
            )
        }
        return await new Promise(resolve => {
            this.channel!.subscribe((status, err) => {
                console.log('channel:', this._channelName, status, err)
                this._channelStatus = status;
            })
            resolve(true);
        })
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
