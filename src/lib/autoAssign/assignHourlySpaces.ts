import { getStartEndTimes } from '$lib/reservationTimes';
import { timeStrToMin } from '$lib/datetimeUtils';
import { Settings } from '$lib/client/settings';
import { getNumberOfOccupants } from '$utils/reservations';
import { blocksToDisplayData } from './hourlyDisplay';
import type { Reservation } from '$types';
import { ReservationCategory } from '$types';

const getWidth = (rsv: Reservation) =>
	rsv.category == ReservationCategory.pool ? getNumberOfOccupants([rsv]) + rsv.buddies.length : 1;

function rsvsToBlock({
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
	let rsv = rsvs[0];
	let startTime = startEndTimes.indexOf(rsv.startTime);
	let endTime = startEndTimes.indexOf(rsv.endTime);
	let width = getWidth(rsv);
	let startSpace = -1; // -1 == unassigned
	if (category == ReservationCategory.pool) {
		//check for pre-assigned lane
		if (rsv.lanes[0] != 'auto') {
			let nSpaces = resourceNames.length;
			let lane = resourceNames.indexOf(rsv.lanes[0]);
			//make sure there's enough room for all required spaces
			if (nSpaces - lane >= width) {
				startSpace = lane;
			}
		}
	} else {
		//classroom
		if (rsv.room != 'auto') {
			startSpace = resourceNames.indexOf(rsv.room);
		}
	}

	return {
		rsvs,
		startTime,
		endTime,
		width,
		startSpace
	};
}

function createBuddyGroups(rsvs: Reservation[]) {
	let remaining = [...rsvs];
	let grps = [];
	let isBuddy = (a: Reservation, b: Reservation) => {
		return a.buddies.includes(b.user.id) && a.startTime == b.startTime;
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
type Grid = number[][];

function emptyBlock({
	spacesByTimes,
	startSpace,
	endSpace,
	startTime,
	endTime
}: {
	spacesByTimes: Grid;
	startSpace: number;
	endSpace: number;
	startTime: number;
	endTime: number;
}) {
	for (let i = startSpace; i < endSpace; i++) {
		for (let j = startTime; j < endTime; j++) {
			if (spacesByTimes[i][j] >= 0) {
				return false;
			}
		}
	}
	return true;
}

function insertPreassigned(spacesByTimes: Grid, blk: Block, blkIdx: number) {
	let valid = emptyBlock({
		spacesByTimes,
		startSpace: blk.startSpace,
		endSpace: blk.startSpace + blk.width,
		startTime: blk.startTime,
		endTime: blk.endTime
	});
	//even if valid==false, we still assign the block here in order to make
	//debugging easier for the admin
	for (let i = blk.startSpace; i < blk.startSpace + blk.width; i++) {
		for (let j = blk.startTime; j < blk.endTime; j++) {
			spacesByTimes[i][j] = blkIdx;
		}
	}
	return valid;
}

function insertUnassigned(spacesByTimes: Grid, blk: Block, blkIdx: number) {
	for (let i = 0; i <= spacesByTimes.length - blk.width; i++) {
		if (
			emptyBlock({
				spacesByTimes,
				startSpace: i,
				endSpace: i + blk.width,
				startTime: blk.startTime,
				endTime: blk.endTime
			})
		) {
			blk.startSpace = i;
			for (let j = i; j < i + blk.width; j++) {
				for (let k = blk.startTime; k < blk.endTime; k++) {
					spacesByTimes[j][k] = blkIdx;
				}
			}
			break;
		}
	}
	return blk.startSpace >= 0;
}

export function assignHourlySpaces(
	rsvs: Reservation[],
	dateStr: string,
	category: ReservationCategory
) {
	let startEndTimes = getStartEndTimes(Settings, dateStr, category);
	let nStartTimes = startEndTimes.length - 1;
	let resourceNames: string[];
	if (category == ReservationCategory.pool) {
		resourceNames = Settings.getPoolLanes(dateStr);
	} else {
		resourceNames = Settings.getClassrooms(dateStr);
	}

	// each tile in the grid represents one space in the pool/one classroom for one timeslot
	// the value of the tile is an index into the blocks array (-1 == unassigned)
	let spacesByTimes: Grid = Array(resourceNames.length)
		.fill(null)
		.map(() => Array(nStartTimes).fill(-1));

	let blocks = createBuddyGroups(rsvs).map((grp) =>
		rsvsToBlock({ rsvs: grp, startEndTimes, category, resourceNames })
	);
	//move pre-assigned to front
	blocks.sort((a, b) => (a.startSpace == -1 ? 1 : -1));

	let success = true;
	for (let i = 0; i < blocks.length; i++) {
		let blk = blocks[i];
		if (blk.startSpace >= 0) {
			success = insertPreassigned(spacesByTimes, blk, i);
		} else {
			success = insertUnassigned(spacesByTimes, blk, i);
		}
		if (!success) break;
	}

	let schedule = blocksToDisplayData(blocks, resourceNames.length, nStartTimes);

	//error indicates conflicting assignments; either there's a bug or the admin made a mistake
	//    even if there's an error, we still display the schedule to help the admin to debug
	let status = success ? 'success' : 'error';
	return { status, schedule };
}
