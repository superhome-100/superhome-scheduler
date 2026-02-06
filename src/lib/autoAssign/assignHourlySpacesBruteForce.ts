import { getStartEndTimes } from '$lib/reservationTimes';
import { rsvsToBlock, createBuddyGroups } from './hourlyUtils';
import type { Block, Grid } from './hourlyUtils';
import { blocksToDisplayData } from './hourlyDisplay';
import type { Reservation } from '$types';
import { ReservationCategory } from '$types';
import type { SettingsManager } from '$lib/settingsManager';

const slotIsAvailable = (sByT: Grid, slot: number, blk: Block) => {
	for (let i = blk.startTime; i < blk.endTime; i++) {
		for (let j = 0; j < blk.width; j++) {
			if (sByT[slot + j][i]) {
				return false;
			}
		}
	}
	return true;
};

const addBlock = (sByT: Grid, slot: number, blk: Block) => {
	for (let i = 0; i < blk.width; i++) {
		for (let j = blk.startTime; j < blk.endTime; j++) {
			sByT[slot + i][j] = true;
		}
	}
};

const removeBlock = (sByT: Grid, slot: number, blk: Block) => {
	for (let i = 0; i < blk.width; i++) {
		for (let j = blk.startTime; j < blk.endTime; j++) {
			sByT[slot + i][j] = false;
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
			addBlock(grid, j, next);
			stats.nrec++;
			if (bfAssignAllRecurse(grid, blocks, curIdx + 1, stats)) {
				// found solution
				next.spacePath.fill(j);
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

	// each tile in the spacesByTimes grid represents one space in the pool/one classroom
	// for one timeslot (true == assigned, false == unassigned)
	let spacesByTimes: Grid = Array(nResources)
		.fill(null)
		.map(() => Array(nStartTimes).fill(false));

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
	sm: SettingsManager,
	rsvs: Reservation[],
	dateStr: string,
	category: ReservationCategory
) {
	let startEndTimes = getStartEndTimes(sm, dateStr, category);
	let nStartTimes = startEndTimes.length - 1;
	let resourceNames: string[];
	if (category == ReservationCategory.pool) {
		resourceNames = sm.getPoolLanes(dateStr);
	} else {
		resourceNames = sm.getClassrooms(dateStr);
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
