import type { ReservationData } from '$types';

import { users } from '$lib/stores';
import { get } from 'svelte/store';

export function validateBuddies(rsv: ReservationData) {
	let userIds = Object.keys(get(users));
	let validBuddies: string[] = [];
	for (let buddy of (rsv.buddies || [])) {
		if (rsv?.user?.id === buddy) {
			return { status: 'error', msg: 'Cannot add yourself as a buddy' };
		}
		if (!userIds.includes(buddy)) {
			return { status: 'error', msg: 'Unknown user in buddy field' };
		}
		if (validBuddies.includes(buddy)) {
			return { status: 'error', msg: 'Duplicate buddies not allowed' };
		}
		validBuddies.push(buddy);
	}
	return { status: 'success' };
}
