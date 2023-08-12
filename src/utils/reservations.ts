import type { ReservationData } from '$types';

export const getNumberOfOccupants = (rsvs: ReservationData[]) =>
	rsvs.reduce((n, rsv) => {
		if (rsv.category === 'classroom') {
			return n + rsv.numStudents!;
		} else {
			return rsv.resType === 'course' ? n + 2 * Math.ceil(rsv.numStudents! / 2) : n + 1;
		}
	}, 0);

// TODO: add all reservation only related reusable utils/fns here
