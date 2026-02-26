import type { Reservation } from '$types';
import { ReservationCategory } from '$types';
import { getNumberOfOccupants } from '$utils/reservations';

export const getWidth = (rsv: Reservation) =>
	rsv.category == ReservationCategory.pool ? getNumberOfOccupants([rsv]) + rsv.buddies.length : 1;

export function rsvsToBlock({
	rsvs,
	startEndTimes,
	category,
	resourceNames
}: {
	rsvs: Reservation[];
	startEndTimes: string[];
	category: ReservationCategory;
	resourceNames: string[];
}) {
	const rsv = rsvs[0];
	const startTime = startEndTimes.indexOf(rsv.startTime);
	const endTime = startEndTimes.indexOf(rsv.endTime);
	const pathLen = endTime - startTime;
	const width = getWidth(rsv);

	const spacePath = Array(pathLen).fill(-1); // -1 == unassigned
	if (category == ReservationCategory.pool) {
		//check for pre-assigned lane
		if (rsv.lanes?.[0] !== 'auto') {
			const nSpaces = resourceNames.length;
			const lane = resourceNames.indexOf(rsv.lanes?.[0]);
			//make sure there's enough room for all required spaces
			if (nSpaces - lane >= width) {
				spacePath.fill(lane);
			}
		}
	} else {
		//classroom
		if (rsv.room != 'auto') {
			spacePath.fill(resourceNames.indexOf(rsv.room));
		}
	}

	return {
		rsvs,
		startTime,
		endTime,
		width,
		spacePath
	};
}

export function createBuddyGroups(rsvs: Reservation[]) {
	let remaining = [...rsvs];
	let grps = [];
	let isBuddy = (a: Reservation, b: Reservation) => {
		return a.buddies.includes(b.user) && a.startTime == b.startTime;
	};
	while (remaining.length > 0) {
		let next = remaining.splice(0, 1)[0];
		let bg = [next];
		for (let i = remaining.length - 1; i >= 0; i--) {
			if (isBuddy(next, remaining[i])) {
				bg.push(remaining.splice(i, 1)[0]);
			}
		}
		grps.push(bg);
	}
	return grps;
}

export type Block = ReturnType<typeof rsvsToBlock>;
export type Grid = boolean[][];
