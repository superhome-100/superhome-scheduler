import { writable } from 'svelte/store';

// Emits a timestamp whenever a reservation is updated from Admin
// Consumers (user-side pages) can subscribe and refetch on change.
export const reservationLastUpdated = writable<number>(0);

export function bumpReservationUpdate() {
  reservationLastUpdated.set(Date.now());
}
