import { debounce } from "ts-debounce";
import type { Database } from '$lib/supabase.types'
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

const EVENTS = [
    'Users',
    'Settings',
    'DaySettings',
    'Reservations',
    'BuoyGroupings',
] as const;
type EventType = typeof EVENTS[number];
type Payload = unknown
type Subscriber = () => void | Promise<void>
type Unsubscribe = () => void


export class SupabaseEventSource {
    private channel: RealtimeChannel | null = null;
    private readonly subscribers = new Map<EventType, Set<Subscriber>>()

    async init(client: SupabaseClient<Database>) {
        await client.realtime.setAuth(); // Needed for Realtime Authorization
        this.channel = client.channel("table_changes", {
            config: { private: true }
        })
        for (const event of EVENTS) {
            const fn = debounce((payload: Payload) => this.dispatch(event, payload), 200, { maxWait: 5000 })
            this.channel.on(
                'broadcast',
                { event },
                payload => fn(payload)
            )
        }
        this.channel.subscribe((status, err) => {
            console.log('table_changes subscriber', status, err)
        })
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

    private dispatch(event: EventType, payload: Payload) {
        for (const fn of this.subscribers.get(event)!) {
            Promise.resolve().then(fn).catch(e => console.error("SupabaseEventSource subscriber error", event, e, payload))
        }
    }

    async destroy(client: SupabaseClient) {
        await client.removeChannel(this.channel!)
    }
}

export const supabase_es = new SupabaseEventSource()