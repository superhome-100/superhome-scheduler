import { Settings as settings } from '$lib/server/settings';
import type { ReservationData } from '$types';

import { getOverlappingReservations } from '$utils/validation';

export const checkAvailableClassroom = (
	sub: ReservationData,
	existingReservations: ReservationData[]
) => {
	const overlapping = getOverlappingReservations(sub, existingReservations).filter(
		(rsv) =>
			rsv.category === sub.category &&
			// todo: fix this flaky type
			rsv?.user?.id != sub.user
	);

	if (overlapping.length >= settings.get('classrooms', sub.date!).length) {
		return {
			status: 'error',
			message:
				'All classrooms are booked at this time.  ' +
				'Please either check back later or try a different date/time'
		};
	} else {
		return { status: 'success' };
	}
};
