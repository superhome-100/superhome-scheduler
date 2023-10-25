import type { Reservation } from '$types';
import type { Block } from './assignPoolSpaces';

const getNextBlock = (blocks: Block[], space: number, time: number) => {
	let { idx } = blocks.reduce(
		({ minStart, idx }, blk, i) =>
			blk.startSpace <= space &&
			space < blk.startSpace + blk.width &&
			time <= blk.startTime &&
			blk.startTime < minStart
				? { minStart: blk.startTime, idx: i }
				: { minStart, idx },
		{ minStart: Infinity, idx: -1 }
	);
	return blocks[idx];
};

const getStyleType = (blk: Block, space: number) => {
	if (blk.width == 1) {
		return 'single';
	} else {
		return space == blk.startSpace
			? 'start'
			: space == blk.startSpace + blk.width - 1
			? 'end'
			: 'middle';
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
				}
				schedule[space].push({
					nSlots: nextBlock.endTime - nextBlock.startTime,
					blkType: 'rsv',
					width: nextBlock.width,
					data: nextBlock.rsvs,
					styleType: getStyleType(nextBlock, space)
				});
				time = nextBlock.endTime;
			} else {
				// no more rsvs in this space: fill to end
				schedule[space].push(filler(nTimeSlots - time));
				time = nTimeSlots;
			}
		}
	}
	return schedule;
}
