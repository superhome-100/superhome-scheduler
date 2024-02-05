import { getStartEndTimes } from '$lib/reservationTimes';
import { Settings } from '$lib/client/settings';
import { ReservationCategory, type Reservation } from '$types';
import type { Block, Grid } from './hourlyUtils';
import { rsvsToBlock, createBuddyGroups } from './hourlyUtils';
import { blocksToDisplayData } from './hourlyDisplay';

function getMinBreaksPath(spacesByTimes: Grid, width: number, startTime: number, endTime: number) {
	let pathObj = getMinBreaksPathRec(spacesByTimes, width, startTime, endTime, {
		breaks: 0,
		path: []
	});
	return pathObj;
}

type PathObj = { breaks: number; path: number[] };
function getMinBreaksPathRec(
	sByT: Grid,
	nSpaces: number,
	curTime: number,
	endTime: number,
	pathObj: PathObj
) {
	if (curTime === endTime) {
		return pathObj;
	}

	const slotIsAvailable = (startSpace: number) => {
		return [...Array(nSpaces).keys()].reduce((b, offset) => {
			return b && sByT[startSpace + offset][curTime] == false;
		}, true);
	};

	let minBreaks = Infinity;
	let bestPath = null;

	// collect all possible valid steps to the next time slot and sort so that the zero-break path is searched first
	const curSpace = pathObj.path.length == 0 ? null : pathObj.path[pathObj.path.length - 1];
	const totalSpaces = sByT.length;
	const validSteps = [];
	for (let space = 0; space <= totalSpaces - nSpaces; space += 1) {
		if (slotIsAvailable(space)) {
			const thisBreak = curSpace == null || space == curSpace ? 0 : 1;
			validSteps.push({ space, thisBreak });
		}
	}
	validSteps.sort((a, b) => a.thisBreak - b.thisBreak);

	// recursively search for the step that results in minimum number of total path breaks
	for (let step of validSteps) {
		let thisPath = getMinBreaksPathRec(sByT, nSpaces, curTime + 1, endTime, {
			breaks: step.thisBreak,
			path: [step.space]
		});
		if (thisPath.path.length > 0) {
			if (thisPath.breaks == 0) {
				// optimal path; stop the search and return this path immediately
				bestPath = thisPath;
				break;
			} else if (thisPath.breaks < minBreaks) {
				minBreaks = thisPath.breaks;
				bestPath = thisPath;
			}
		}
	}
	if (bestPath) {
		pathObj.breaks += bestPath.breaks;
		pathObj.path = pathObj.path.concat(bestPath.path);
	} else {
		pathObj.path = [];
	}
	return pathObj;
}

function insertPreAssigned(spacesByTimes: Grid, blk: Block) {
	for (let t = blk.startTime; t < blk.endTime; t++) {
		let startSpace = blk.spacePath[t - blk.startTime];
		for (let s = 0; s < blk.width; s++) {
			spacesByTimes[startSpace + s][t] = true;
		}
	}
}

function insertUnAssigned(spacesByTimes: Grid, blk: Block) {
	let bestPath = getMinBreaksPath(spacesByTimes, blk.width, blk.startTime, blk.endTime);
	if (bestPath.path.length > 0) {
		blk.spacePath = bestPath.path;
		for (let time = blk.startTime; time < blk.endTime; time++) {
			const space = bestPath.path[time - blk.startTime];
			for (let i = space; i < space + blk.width; i++) {
				spacesByTimes[i][time] = true;
			}
		}
		return bestPath.breaks;
	} else {
		return -1;
	}
}

function removeAssigned(spacesByTimes: Grid, blocks: Block[]) {
	for (const blk of blocks) {
		if (blk.spacePath[0] >= 0) {
			for (let time = blk.startTime; time < blk.endTime; time++) {
				const space = blk.spacePath[time - blk.startTime];
				for (let i = space; i < space + blk.width; i++) {
					spacesByTimes[i][time] = false;
				}
			}
			blk.spacePath.fill(-1);
		}
	}
}

const tryInsertUnassigned = (spacesByTimes: Grid, unAsn: Block[]) => {
	let failedIdx = -1;
	const brokenIds = [];
	let nBreaks = 0;
	for (let i = 0; i < unAsn.length; i++) {
		const thisBreaks = insertUnAssigned(spacesByTimes, unAsn[i]);
		if (thisBreaks == -1) {
			failedIdx = i;
			break;
		} else if (thisBreaks > 0) {
			nBreaks += thisBreaks;
			brokenIds.push(i);
		}
	}
	return { failedIdx, brokenIds, nBreaks };
};

const searchForBestOrdering = (MAX_TRIALS: number, spacesByTimes: Grid, unAssigned: Block[]) => {
	let bestOrder: Block[] = [];
	let minBreaks = Infinity;
	for (let trial = 0; trial < MAX_TRIALS; trial++) {
		const { failedIdx, brokenIds, nBreaks } = tryInsertUnassigned(spacesByTimes, unAssigned);
		if (failedIdx >= 0) {
			// not possible to assign all blocks with this ordering
			// move the unassignable block to the front of the list and try again
			console.log('failure', failedIdx, unAssigned[failedIdx].rsvs);
			removeAssigned(spacesByTimes, unAssigned);
			const blk = unAssigned.splice(failedIdx, 1)[0];
			unAssigned = [blk, ...unAssigned];
		} else if (brokenIds.length > 0) {
			// assignment succeeded but with at least one broken path
			// save the min-break assignment and continue searching for a better one
			if (nBreaks < minBreaks) {
				minBreaks = nBreaks;
				bestOrder = [...unAssigned];
			}
			//move blocks with broken paths to front
			const brkn = brokenIds.reduce((brkn: Block[], idx) => {
				brkn.push(unAssigned.splice(idx, 1)[0]);
				return brkn;
			}, []);
			unAssigned = [...brkn, ...unAssigned];
			console.log('broken', brkn);
			removeAssigned(spacesByTimes, unAssigned);
		} else {
			bestOrder = [...unAssigned];
			removeAssigned(spacesByTimes, unAssigned);
			break;
		}
	}
	return bestOrder;
};

export function assignHourlySpaces(
	rsvs: Reservation[],
	dateStr: string,
	category: ReservationCategory
) {
	const startEndTimes = getStartEndTimes(Settings, dateStr, category);
	const nStartTimes = startEndTimes.length - 1;
	let resourceNames: string[];
	if (category == ReservationCategory.pool) {
		resourceNames = Settings.getPoolLanes(dateStr);
	} else {
		resourceNames = Settings.getClassrooms(dateStr);
	}
	const nSpaces = resourceNames.length;

	const blocks = createBuddyGroups(rsvs).map((grp) =>
		rsvsToBlock({ rsvs: grp, startEndTimes, category, resourceNames })
	);

	// separate pre-assigned and unassigned
	let { preAsn, unAsn } = blocks.reduce(
		({ preAsn, unAsn }: { [key: string]: Block[] }, blk) => {
			if (blk.spacePath[0] == -1) {
				unAsn.push(blk);
			} else {
				preAsn.push(blk);
			}
			return { preAsn, unAsn };
		},
		{ preAsn: [], unAsn: [] }
	);

	const spacesByTimes = Array(nSpaces)
		.fill(null)
		.map(() => Array(nStartTimes).fill(false));

	for (let i = 0; i < preAsn.length; i++) {
		insertPreAssigned(spacesByTimes, preAsn[i]);
	}

	// The order in which blocks are assigned can affect the quality of assignments that the
	// minBreaksPath algorithm produces for all blocks, and it can even determine wether the
	// algorithm is able to find any valid assignment, so we try up to MAX_TRIALS different
	// orderings in order to increase the chance that we find the best possible assignment
	// (the ideal assignment has zero breaks for all blocks, but this is not guaranteed to
	// exist).
	// We limit the number of trials because trying all possible orderings is O(n!)
	const MAX_TRIALS = 10;
	const bestOrder = searchForBestOrdering(MAX_TRIALS, spacesByTimes, unAsn);
	const { failedIdx } = tryInsertUnassigned(spacesByTimes, bestOrder);

	let success = failedIdx == -1;
	const schedule = blocksToDisplayData([...preAsn, ...bestOrder], nSpaces, nStartTimes);

	return { status: success ? 'success' : 'error', schedule };
}
