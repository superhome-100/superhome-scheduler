import type { Reservation } from '$types';
import type { Block } from './hourlyUtils';

const getNextBlock = (blocks: Block[], space: number, time: number) => {
	let { idx } = blocks.reduce(
		({ minStart, idx }, blk, i) => {
			const tOffset = time - blk.startTime;
			const relativeBlkStart = tOffset < 0 ? blk.startTime : tOffset + blk.startTime;
			const startSpace = tOffset < 0 ? blk.spacePath[0] : blk.spacePath[tOffset];
			if (
				startSpace <= space &&
				space < startSpace + blk.width &&
				time <= relativeBlkStart &&
				relativeBlkStart < minStart
			) {
				return { minStart: relativeBlkStart, idx: i };
			} else {
				return { minStart, idx };
			}
		},
		{ minStart: Infinity, idx: -1 }
	);
	return blocks[idx];
};

export const getStyleType = (width: number, startSpace: number, space: number) => {
	if (width == 1) {
		return 'single';
	} else {
		return space == startSpace ? 'start' : space == startSpace + width - 1 ? 'end' : 'middle';
	}
};

type DisplayBlock = {
	nSlots: number;
	blkType: string;
	data: Reservation[];
	width: number;
	styleType: string;
};

//convert schedule data into format that the DayHourly component knows how to display
export function blocksToDisplayData(blocks: Block[], nSpaces: number, nTimeSlots: number) {
	let schedule: DisplayBlock[][] = Array(nSpaces)
		.fill(null)
		.map(() => {
			return [];
		});

	// filler objects are used for adding empty space
	// between reservations on DayHourly display
	const filler = (nSlots: number) => {
		return {
			nSlots,
			blkType: 'filler',
			width: 0,
			data: [],
			styleType: 'single'
		};
	};

	//for each pool space, add either reservation blocks
	//or filler in chronological order until all timeslots are covered
	for (let space = 0; space < nSpaces; space++) {
		let time = 0;
		while (time < nTimeSlots) {
			let nextBlock = getNextBlock(blocks, space, time);
			if (nextBlock) {
				if (nextBlock.startTime > time) {
					// add filler up until start of next rsv
					schedule[space].push(filler(nextBlock.startTime - time));
					time = nextBlock.startTime;
				}
				const tOffset = time - nextBlock.startTime;
				const startSpace = nextBlock.spacePath[tOffset];
				const unbrokenLength = nextBlock.spacePath
					.slice(tOffset)
					.reduce((n: number, s) => (s == startSpace ? n + 1 : n), 0);

				schedule[space].push({
					nSlots: unbrokenLength,
					blkType: 'rsv',
					width: nextBlock.width,
					data: nextBlock.rsvs,
					styleType: getStyleType(nextBlock.width, startSpace, space)
				});

				time += unbrokenLength;
			} else {
				// no more rsvs in this space: fill to end
				schedule[space].push(filler(nTimeSlots - time));
				time = nTimeSlots;
			}
		}
	}
	return schedule;
}
