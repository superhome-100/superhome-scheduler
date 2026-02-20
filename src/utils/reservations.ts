import type { Submission } from '$types';

export const getNumberOfOccupants = (rsvs: Submission[]) =>
	rsvs.reduce((n, rsv) => {
		if (rsv.category === 'classroom') {
			return n + (rsv.numStudents ?? 0);
		} else if (rsv.resType === 'course') {
			return n + 2 * Math.ceil((rsv.numStudents ?? 0) / 2);
		} else {
			return n + 1
		}
	}, 0);

// TODO: add all reservation only related reusable utils/fns here
