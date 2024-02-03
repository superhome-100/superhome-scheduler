import { getStartEndTimes } from '$lib/reservationTimes';
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

const slotIsAvailable = (sByT: Grid, slot: number, blk: Block) => {
	for (let i = blk.startTime; i < blk.endTime; i++) {
		for (let j = 0; j < blk.width; j++) {
			if (sByT[slot + j][i] != -1) {
				return false;
			}
		}
	}
	return true;
};

const addBlock = (sByT: Grid, slot: number, blk: Block, blkIdx: number) => {
	for (let i = 0; i < blk.width; i++) {
		for (let j = blk.startTime; j < blk.endTime; j++) {
			sByT[slot + i][j] = blkIdx;
		}
	}
};

const removeBlock = (sByT: Grid, slot: number, blk: Block) => {
	for (let i = 0; i < blk.width; i++) {
		for (let j = blk.startTime; j < blk.endTime; j++) {
			sByT[slot + i][j] = -1;
		}
	}
};

type Stats = { nrec: number };
const bfAssignAllRecurse = (grid: Grid, blocks: Block[], curIdx: number, stats: Stats): boolean => {
	if (curIdx == blocks.length) {
		// found solution
		return true;
	}

	const next = blocks[curIdx];
	for (let j = 0; j < grid.length - next.width + 1; j++) {
		if (slotIsAvailable(grid, j, next)) {
			addBlock(grid, j, next, curIdx + 1);
			stats.nrec++;
			if (bfAssignAllRecurse(grid, blocks, curIdx + 1, stats)) {
				// found solution
				next.startSpace = j;
				return true;
			} else {
				//remove this assignment from the grid and try the next assignment
				removeBlock(grid, j, next);
			}
		}
	}

	// failed to find a solution with this arrangement
	return false;
};

const bruteForceAssignAll = (blocks: Block[], nResources: number, nStartTimes: number) => {
	// iterate through all possible assignments of reservations to resource slots and return
	// the first assignment that works for all reservations

	// each tile in the spacesByTimes grid represents one space in the pool/one classroom for one timeslot
	// the value of the tile is an index into the blocks array (-1 == unassigned)
	let spacesByTimes: Grid = Array(nResources)
		.fill(null)
		.map(() => Array(nStartTimes).fill(-1));

	const stats = { nrec: 0 };
	const success = bfAssignAllRecurse(spacesByTimes, blocks, 0, stats);

	/*
	if (success) {
		console.log('found solution after ' + stats.nrec + ' recursions');
	} else {
		console.log('no solution');
	}*/

	return success;
};

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
	const nResources = resourceNames.length;

	let blocks = createBuddyGroups(rsvs).map((grp) =>
		rsvsToBlock({ rsvs: grp, startEndTimes, category, resourceNames })
	);
	let success = bruteForceAssignAll(blocks, nResources, nStartTimes);
	let schedule = blocksToDisplayData(blocks, nResources, nStartTimes);

	//error most likely indicates conflicting assignments due to a bug
	//even if there's an error, we still display the schedule to help the admin to debug
	let status = success ? 'success' : 'error';
	return { status, schedule };
}
