import { inc, startTimes } from '$lib/reservationTimes';
import { timeStrToMin } from '$lib/datetimeUtils';
import { getNumberOfOccupants } from '$utils/reservations';
import type { SettingsManager } from '$lib/settings';

interface Reservation {
	id: string;
	user: string;
	resType: string;
	startTime: string;
	endTime: string;
	category: string;
	buddies: string[];
	owner?: boolean;
	buddyRsvs?: Reservation[];
	lanes?: string[];
	room?: string | null;
}

interface Block {
	rsv: Reservation;
	startTime: number;
	endTime: number;
	width: number;
	startSpaces: number[] | null;
}

interface PathObject {
	breaks: number;
	path: number[] | null;
}

interface SortedStep {
	i: number;
	thisBreak: number;
}

interface ScheduleBlock {
	nSlots: number;
	blkType: 'filler' | 'rsv';
	data: Reservation[];
	width: number;
	styleType: 'single' | 'start' | 'middle' | 'end';
	relativeSpace?: number;
}

// priority rules:
//   1 pre-assigned rsvs
//          1.1 pre-assigned courses
//          1.2 pre-assigned buddies
//          1.3 pre-assigned solo
//   2 unassigned courses
//   3 unassigned buddies
//   4 unassigned solo
const sorted = (rsvs: Reservation[]): Reservation[] =>
	rsvs.sort((a, b) =>
		a.resType === 'course'
			? -1
			: b.resType === 'course'
				? 1
				: a.buddies.length > b.buddies.length
					? -1
					: b.buddies.length > a.buddies.length
						? 1
						: 0
	);

function sortByPriority(rsvs: Reservation[]): { pre: Reservation[]; un: Reservation[] } {
	const owners = rsvs.filter((rsv) => rsv.owner);
	for (const owner of owners) {
		owner.buddyRsvs = [];
		for (const buddy of owner.buddies) {
			const q = rsvs.filter(
				(rsv) =>
					rsv.user === buddy &&
					rsv.buddies.includes(owner.user) &&
					rsv.startTime === owner.startTime
			);
			// length could be zero if buddy's rsv was rejected
			if (q.length == 1) {
				owner.buddyRsvs.push(q[0]);
			}
		}
	}
	const preAssigned: Reservation[] = [];
	const unAssigned: Reservation[] = [];
	owners.forEach((rsv) => {
		if (rsv.category === 'pool') {
			rsv.lanes?.[0] === 'auto' ? unAssigned.push(rsv) : preAssigned.push(rsv);
		} else if (rsv.category === 'classroom') {
			rsv.room == null ? unAssigned.push(rsv) : preAssigned.push(rsv);
		}
	});
	return { pre: sorted(preAssigned), un: sorted(unAssigned) };
}

function getMinBreaksPath(
	spacesByTimes: (Reservation | null)[][],
	laneWidth: number,
	width: number,
	startTime: number,
	endTime: number
): number[] | null {
	const { path } = getMinBreaksPathRec(spacesByTimes, laneWidth, width, startTime, endTime, {
		breaks: 0,
		path: []
	});
	return path;
}

function getMinBreaksPathRec(
	spacesByTimes: (Reservation | null)[][],
	laneWidth: number,
	width: number,
	curTime: number,
	endTime: number,
	pathObj: PathObject
): PathObject {
	if (curTime === endTime) {
		return pathObj;
	}
	let minBreaks = Infinity;
	let bestPath: PathObject | null = null;

	const allNull = (start: number): boolean => {
		return [...Array(width).keys()].reduce((b, idx) => {
			return b && spacesByTimes[start + idx][curTime] == null;
		}, true);
	};

	const sharedLane = (space: number): boolean => {
		if (laneWidth > 1 && width == 1) {
			if (space % 2 == 0) {
				return spacesByTimes[space + 1][curTime] != null;
			} else {
				return spacesByTimes[space - 1][curTime] != null;
			}
		} else {
			return false;
		}
	};

	// startSpace will be undefined if curTime == startTime
	const startSpace = pathObj.path[pathObj.path.length - 1];
	const sortedSteps: SortedStep[] = [];
	for (let i = 0; i <= spacesByTimes.length - width; i += width) {
		if (allNull(i)) {
			let thisBreak = startSpace == null ? 0 : i == startSpace ? 0 : 1;
			thisBreak += sharedLane(i) ? 0.5 : 0;
			sortedSteps.push({ i, thisBreak });
		}
	}
	sortedSteps.sort((a, b) => (a.thisBreak > b.thisBreak ? 1 : b.thisBreak > a.thisBreak ? -1 : 0));

	for (const step of sortedSteps) {
		const thisPath = getMinBreaksPathRec(spacesByTimes, laneWidth, width, curTime + 1, endTime, {
			breaks: step.thisBreak,
			path: [step.i]
		});
		if (thisPath.path != null) {
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
		pathObj.path = null;
	}
	return pathObj;
}

const getWidth = (rsv: Reservation): number => getNumberOfOccupants([rsv]) + rsv.buddies.length;

function rsvToBlock(
	rsv: Reservation,
	minTime: number,
	inc: number,
	resourceNames: string[]
): Block {
	const startTime = (timeStrToMin(rsv.startTime) - minTime) / inc;
	const endTime = (timeStrToMin(rsv.endTime) - minTime) / inc;
	const occ = 1;
	const width = getWidth(rsv);
	let startSpaces: number[] | null;

	if (rsv.category === 'pool') {
		startSpaces =
			rsv.lanes?.[0] !== 'auto'
				? rsv.lanes?.map((lane) => occ * resourceNames.indexOf(lane)) ?? null
				: null;
	} else if (rsv.category === 'classroom') {
		startSpaces = rsv.room ? [resourceNames.indexOf(rsv.room)] : null;
	} else {
		startSpaces = null;
	}

	return {
		rsv,
		startTime,
		endTime,
		width,
		startSpaces
	};
}

function insertPreAssigned(spacesByTimes: (Reservation | null)[][], blk: Block): void {
	if (blk.startSpaces) {
		const startSpace = blk.startSpaces[0];
		for (let i = startSpace; i < startSpace + blk.width; i++) {
			for (let j = blk.startTime; j < blk.endTime; j++) {
				spacesByTimes[i][j] = blk.rsv;
			}
		}
	}
}

function insertUnAssigned(
	spacesByTimes: (Reservation | null)[][],
	laneWidth: number,
	blk: Block
): { status: string; code?: string } {
	const bestPath = getMinBreaksPath(
		spacesByTimes,
		laneWidth,
		blk.width,
		blk.startTime,
		blk.endTime
	);
	if (bestPath) {
		for (let time = blk.startTime; time < blk.endTime; time++) {
			const space = bestPath[time - blk.startTime];
			for (let i = space; i < space + blk.width; i++) {
				spacesByTimes[i][time] = blk.rsv;
			}
		}
	} else {
		return {
			status: 'error',
			code: 'OUT_OF_SPACE'
		};
	}
	return { status: 'success' };
}

export function oldAssignPoolSpaces(
	sm: SettingsManager,
	rsvs: Reservation[],
	dateStr: string
): {
	status: string;
	schedule?: ScheduleBlock[][];
	code?: string;
	rsv?: Reservation;
} {
	const incT = inc(sm, dateStr);
	const sTs = startTimes(sm, dateStr, 'pool');
	const nTimes = sTs.length;
	const minTime = timeStrToMin(sTs[0]);
	const laneWidth = 1;
	const nSpaces = laneWidth * sm.getPoolLanes(dateStr).length;
	const spacesByTimes: (Reservation | null)[][] = Array(nSpaces)
		.fill(null)
		.map(() => Array(nTimes).fill(null));

	const { pre, un } = sortByPriority(rsvs);
	const resourceNames = sm.getPoolLanes(dateStr);

	let result: {
		status: string;
		schedule?: ScheduleBlock[][];
		code?: string;
		rsv?: Reservation;
	} = {
		status: 'success',
		schedule: []
	};

	for (const rsv of pre) {
		insertPreAssigned(spacesByTimes, rsvToBlock(rsv, minTime, incT, resourceNames));
	}

	for (const rsv of un) {
		const thisResult = insertUnAssigned(
			spacesByTimes,
			laneWidth,
			rsvToBlock(rsv, minTime, incT, resourceNames)
		);
		if (thisResult.status === 'error') {
			result.status = 'error';
			result.code = thisResult.code;
			result.rsv = rsv;
			return result;
		}
	}

	if (result.status === 'success') {
		result.schedule = patchSchedule(spacesByTimes);
	}
	return result;
}

function dataAreDifferent(A: Reservation[], B: Reservation[]): boolean {
	const idsA = new Set(A.map((rsv) => rsv.id));
	const idsB = new Set(B.map((rsv) => rsv.id));
	if (idsA.size != idsB.size) {
		return true;
	}
	for (const id of idsA) {
		if (!idsB.has(id)) {
			return true;
		}
	}
	return false;
}

function patchData(space: Reservation | null): Reservation[] {
	const data: Reservation[] = [];
	if (space != null) {
		data.push(space);
		data.push(...(space.buddyRsvs ?? []));
	}
	return data;
}

function setRelativeSpace(
	sByT: (Reservation | null)[][],
	space: number,
	t: number,
	blk: ScheduleBlock
): void {
	if (space === 0) {
		blk.relativeSpace = 0;
	} else {
		let relSpace = 0;
		for (let s = space - 1; s >= 0; s--) {
			const pre = sByT[s][t];
			if (pre != null && pre.id === blk.data[0].id) {
				relSpace++;
			} else {
				break;
			}
		}
		blk.relativeSpace = relSpace;
	}
}

const getStyleType = (
	width: number,
	startSpace: number | null,
	space: number
): 'single' | 'start' | 'middle' | 'end' => {
	if (width <= 1) {
		return 'single';
	} else {
		return space == startSpace ? 'start' : space == startSpace! + width - 1 ? 'end' : 'middle';
	}
};

function patchSchedule(sByT: (Reservation | null)[][]): ScheduleBlock[][] {
	const schedule: ScheduleBlock[][] = Array(sByT.length)
		.fill(null)
		.map(() => []);
	const nSlots = sByT[0].length;

	const getStartSpace = (space: number, t: number): number =>
		space > 0 && sByT[space - 1][t] && sByT[space - 1][t]?.id == sByT[space][t]?.id
			? getStartSpace(space - 1, t)
			: space;

	for (let t = 0; t < nSlots; t++) {
		for (let space = 0; space < schedule.length; space++) {
			const data = patchData(sByT[space][t]);
			const blkType = data.length == 0 ? 'filler' : 'rsv';
			const width = blkType == 'filler' ? 0 : getWidth(data[0]);
			const curBlk = t == 0 ? null : schedule[space][schedule[space].length - 1];

			if (curBlk == null || curBlk.blkType != blkType) {
				const blk: ScheduleBlock = {
					nSlots: 1,
					blkType,
					data,
					width,
					styleType: getStyleType(width, blkType == 'rsv' ? getStartSpace(space, t) : null, space)
				};
				schedule[space].push(blk);
			} else if (blkType === 'rsv') {
				if (dataAreDifferent(data, curBlk.data)) {
					const blk: ScheduleBlock = {
						nSlots: 1,
						blkType,
						data,
						width,
						styleType: getStyleType(width, blkType == 'rsv' ? getStartSpace(space, t) : null, space)
					};
					schedule[space].push(blk);
				} else {
					curBlk.nSlots += 1;
				}
			} else {
				curBlk.nSlots += 1;
			}

			const lastBlk = schedule[space][schedule[space].length - 1];
			if (blkType === 'rsv' && lastBlk.nSlots == 1) {
				setRelativeSpace(sByT, space, t, lastBlk);
			}
		}
	}
	return schedule;
}
