import { getStartEndTimes } from '$lib/reservationTimes';
import { ReservationCategory, type Reservation, ReservationType } from '$types';
import type { Block, Grid } from './hourlyUtils';
import { rsvsToBlock, createBuddyGroups } from './hourlyUtils';
import { blocksToDisplayData } from './hourlyDisplay';
import { getNumberOfOccupants } from '$utils/reservations';

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

const searchForBestOrdering = (MAX_TRIALS: number, spacesByTimes: Grid, blocks: Block[]) => {
	let bestOrder = [...blocks];
	let minBreaks = Infinity;
	let nTrials = 0;
	while (nTrials < MAX_TRIALS) {
		nTrials++;
		const { failedIdx, brokenIds, nBreaks } = tryInsertUnassigned(spacesByTimes, blocks);
		if (failedIdx >= 0) {
			// not possible to assign all blocks with this ordering
			// move the unassignable block to the front of the list and try again
			removeAssigned(spacesByTimes, blocks);
			const blk = blocks.splice(failedIdx, 1)[0];
			blocks = [blk, ...blocks];
		} else if (brokenIds.length > 0) {
			// assignment succeeded but with at least one broken path
			// save the min-break assignment and continue searching for a better one
			if (nBreaks < minBreaks) {
				minBreaks = nBreaks;
				bestOrder = [...blocks];
			}
			//move blocks with broken paths to front
			brokenIds.sort((a, b) => b - a);
			const brkn = brokenIds.reduce((brkn: Block[], idx) => {
				brkn.push(blocks.splice(idx, 1)[0]);
				return brkn;
			}, []);
			blocks = [...brkn, ...blocks];
			removeAssigned(spacesByTimes, blocks);
		} else {
			bestOrder = [...blocks];
			removeAssigned(spacesByTimes, blocks);
			break;
		}
	}
	return { bestOrder, nTrials };
};

function breakUpNextGroup(blocks: Block[]) {
	const nextGrpIdx = blocks.reduce(
		(idx, blk, blk_i) => (idx == -1 && blk.width > 1 ? blk_i : idx),
		-1
	);
	const grp = blocks.splice(nextGrpIdx, 1)[0];

	let rsvs: Reservation[] = [];
	if (grp.rsvs[0].resType == ReservationType.course) {
		const nSlots = getNumberOfOccupants(grp.rsvs);
		for (let i = 0; i < nSlots; i++) {
			rsvs.push({ ...grp.rsvs[0] });
		}
	} else {
		rsvs = grp.rsvs;
	}
	for (const rsv of rsvs) {
		blocks.push({
			rsvs: [rsv],
			startTime: grp.startTime,
			endTime: grp.endTime,
			width: 1,
			spacePath: Array(grp.endTime - grp.startTime).fill(-1)
		});
	}
}

function initializeGrid(blocks: Block[], nSpaces: number, nStartTimes: number) {
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
	return { spacesByTimes, preAsn, unAsn };
}

export function assignBlockSpacePaths(
	blocks: Block[],
	nSpaces: number,
	nStartTimes: number,
	maxTrials: number
) {
	let state = initializeGrid(blocks, nSpaces, nStartTimes);
	// The order in which blocks are assigned can affect the quality of assignments that the minBreaksPath
	// algorithm produces, so we try up to maxTrials different orderings in order to increase the chance
	// that we find the best possible assignment (the ideal assignment has zero breaks for all blocks,
	// but this is not guaranteed to exist).
	let searchResult = searchForBestOrdering(maxTrials, state.spacesByTimes, state.unAsn);
	let assignResult = tryInsertUnassigned(state.spacesByTimes, searchResult.bestOrder);

	if (assignResult.failedIdx >= 0) {
		//failed to find a valid assignment for the given blocks, so iteratively break up the
		//next course/buddy group into separate blocks and try reassigning.  This is guaranteed
		//to eventually succeed
		while (assignResult.failedIdx >= 0) {
			removeAssigned(state.spacesByTimes, searchResult.bestOrder);
			breakUpNextGroup(blocks);
			state = initializeGrid(blocks, nSpaces, nStartTimes);
			searchResult = searchForBestOrdering(maxTrials, state.spacesByTimes, state.unAsn);
			assignResult = tryInsertUnassigned(state.spacesByTimes, searchResult.bestOrder);
		}
	}
	return {
		status: assignResult.failedIdx == -1 ? 'success' : 'error',
		failedIdx: assignResult.failedIdx,
		bestOrder: searchResult.bestOrder,
		nTrials: searchResult.nTrials,
		nBreaks: assignResult.nBreaks
	};
}

export function assignHourlySpaces(
	sm: SettingsManager,
	rsvs: Reservation[],
	dateStr: string,
	category: ReservationCategory
) {
	const startEndTimes = getStartEndTimes(sm, dateStr, category);
	const nStartTimes = startEndTimes.length - 1;
	let resourceNames: string[];
	if (category == ReservationCategory.pool) {
		resourceNames = sm.getPoolLanes(dateStr);
	} else {
		resourceNames = sm.getClassrooms(dateStr);
	}
	const nSpaces = resourceNames.length;

	let blocks = createBuddyGroups(rsvs).map((grp) =>
		rsvsToBlock({ rsvs: grp, startEndTimes, category, resourceNames })
	);

	// We limit the number of trials because searching all possible orderings is O(n!)
	const MAX_TRIALS = 100;
	let result = assignBlockSpacePaths(blocks, nSpaces, nStartTimes, MAX_TRIALS);
	const schedule = blocksToDisplayData(blocks, nSpaces, nStartTimes);
	return { status: result.status, schedule };
}
