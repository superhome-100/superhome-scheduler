import { inc, startTimes } from '$lib/reservationTimes';
import { timeStrToMin } from '$lib/datetimeUtils';
import { Settings } from '$lib/client/settings';
import { getNumberOfOccupants } from '$utils/reservations';
import { blocksToDisplayData } from './poolDisplay';
import type { Reservation } from '$types';
import { ReservationCategory } from '$types';

const getTimeSettings = (dateStr: string) => {
	let incT = inc(Settings, dateStr);
	let sTs = startTimes(Settings, dateStr, ReservationCategory.pool);
	let nTimes = sTs.length;
	let minTime = timeStrToMin(sTs[0]);
	return {
		inc: incT,
		nTimes,
		minTime
	};
};

type TimeSettings = ReturnType<typeof getTimeSettings>;

const timeIdx = (time: string, timeSettings: TimeSettings) => {
	return (timeStrToMin(time) - timeSettings.minTime) / timeSettings.inc;
};

const getWidth = (rsv: Reservation) => getNumberOfOccupants([rsv]) + rsv.buddies.length;

function rsvsToBlock(rsvs: Reservation[], timeSettings: TimeSettings, resourceNames: string[]) {
	let rsv = rsvs[0];
	let startTime = timeIdx(rsv.startTime, timeSettings);
	let endTime = timeIdx(rsv.endTime, timeSettings);
	let width = getWidth(rsv);
	let startSpace = -1;
	//check for pre-assigned lane
	if (rsv.lanes.length > 0) {
		let nSpaces = resourceNames.length;
		let lane = resourceNames.indexOf(rsv.lanes[0]);
		//make sure there's enough room for all require spaces
		if (nSpaces - lane >= width) {
			startSpace = lane;
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

function emptyBlock(
	spacesByTimes: Grid,
	startSpace: number,
	endSpace: number,
	startTime: number,
	endTime: number
) {
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
	let valid = emptyBlock(
		spacesByTimes,
		blk.startSpace,
		blk.startSpace + blk.width,
		blk.startTime,
		blk.endTime
	);
	for (let i = blk.startSpace; i < blk.startSpace + blk.width; i++) {
		for (let j = blk.startTime; j < blk.endTime; j++) {
			spacesByTimes[i][j] = blkIdx;
		}
	}
	return valid;
}

function insertUnassigned(spacesByTimes: Grid, blk: Block, blkIdx: number) {
	for (let i = 0; i <= spacesByTimes.length - blk.width; i++) {
		if (emptyBlock(spacesByTimes, i, i + blk.width, blk.startTime, blk.endTime)) {
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

export function assignPoolSpaces(rsvs: Reservation[], dateStr: string) {
	let timeSettings = getTimeSettings(dateStr);
	let resourceNames = Settings.getPoolLanes(dateStr);
	let spacesByTimes: Grid = Array(resourceNames.length)
		.fill(null)
		.map(() => Array(timeSettings.nTimes).fill(-1));

	let blocks = createBuddyGroups(rsvs).map((grp) => rsvsToBlock(grp, timeSettings, resourceNames));
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

	let schedule = blocksToDisplayData(blocks, resourceNames.length, timeSettings.nTimes);

	//error indicates conflicting assignments; either there's a bug or the admin made a mistake
	//    even if there's an error, we still display the schedule to help the admin to debug
	let status = success ? 'success' : 'error';
	return { status, schedule };
}
