import { test, expect } from 'vitest';
import type { Grid, Block } from '../src/lib/autoAssign/hourlyUtils';
import {
	searchForBestOrdering,
	tryInsertUnassigned,
	insertPreAssigned
} from '../src/lib/autoAssign/assignHourlySpacesWithBreaks.js';
import { ASSIGNABLE } from './assignHourly.testcases';
import UNASSIGNABLE from './assignHourly.testcases.unassignable';

const nStart = 24;
const nLane = 8;

const createGrid = () => {
	return Array(nLane)
		.fill(null)
		.map(() => Array(nStart).fill(-1));
};

const printGrid = (sByT: Grid | NGrid) => {
	console.log();
	for (let i = 0; i < sByT.length + 1; i++) {
		let row = '';
		for (let j = 0; j < sByT[0].length + 1; j++) {
			if (i == 0) {
				if (j == 0) {
					row += '   ';
				}
				if (j < nStart) {
					row += j.toString().padStart(2) + '|';
				}
			} else if (j == 0) {
				row += (i - 1).toString().padStart(2) + '|';
			} else if (typeof sByT[i - 1][j - 1] == 'boolean') {
				if (sByT[i - 1][j - 1] == false) {
					row += '  ';
				} else {
					row += ' X';
				}
			} else {
				if (sByT[i - 1][j - 1] == -1) {
					row += '  ';
				} else {
					row += sByT[i - 1][j - 1].toString().padStart(2);
				}
			}
			if (i > 0 && j > 0 && j < sByT[0].length) row += ',';
		}
		console.log(row);
	}
	console.log();
};

const randI = (max: number) => {
	return Math.floor(Math.random() * max);
};

const randomBlock = () => {
	const start = randI(nStart);
	// total time limited to 8 slots (4 hours)
	const end = start + 1 + randI(Math.min(nStart - start, 8));

	// width limited to half the pool (nLane/2)
	return {
		startTime: start,
		endTime: end,
		width: 1 + randI(nLane / 2),
		spacePath: Array(end - start).fill(-1),
		rsvs: []
	};
};

type NGrid = number[][];

const addBlock = (sByT: NGrid, blk: Block, blkIdx: number) => {
	for (let i = 0; i < blk.width; i++) {
		for (let j = blk.startTime; j < blk.endTime; j++) {
			const space = blk.spacePath[j - blk.startTime];
			sByT[space + i][j] = blkIdx;
		}
	}
};

const spaceAvailable = (existing: Block[], blk: Block) => {
	for (let i = blk.startTime; i < blk.endTime; i++) {
		let nSpaces = nLane;
		for (const ex of existing) {
			if (ex.startTime <= i && ex.endTime > i) {
				nSpaces -= ex.width;
			}
		}
		if (nSpaces < blk.width) {
			return false;
		}
	}
	return true;
};

const getNumFullTimeSlots = (blocks: Block[]) => {
	let n = 0;
	for (let i = 0; i < nStart; i++) {
		let nFree = nLane;
		for (const blk of blocks) {
			if (blk.startTime <= i && blk.endTime > i) {
				nFree -= blk.width;
			}
		}
		if (nFree == 0) n++;
	}
	return n;
};

const generateTestCase = (nFull: number) => {
	const blocks: Block[] = [randomBlock()];
	while (getNumFullTimeSlots(blocks) < nFull) {
		const blk = randomBlock();
		if (spaceAvailable(blocks, blk)) {
			blocks.push(blk);
		}
	}
	return blocks;
};

const gridFromBlocks = (blocks: Block[]) => {
	const grid = createGrid();
	for (let i = 0; i < blocks.length; i++) {
		if (blocks[i].spacePath[0] > -1) {
			addBlock(grid, blocks[i], i);
		}
	}
	return grid;
};

const execute_test = (MAX_TRIALS: number, blocks: Block[], verbose = false) => {
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

	const spacesByTimes = Array(nLane)
		.fill(null)
		.map(() => Array(nStart).fill(false));

	for (let i = 0; i < preAsn.length; i++) {
		insertPreAssigned(spacesByTimes, preAsn[i]);
	}

	const { bestOrder, nTrials } = searchForBestOrdering(MAX_TRIALS, spacesByTimes, unAsn);
	const { failedIdx, nBreaks } = tryInsertUnassigned(spacesByTimes, bestOrder);
	if (verbose) {
		const grid = gridFromBlocks([...preAsn, ...bestOrder]);
		printGrid(grid);
		if (failedIdx == -1) {
			console.log('found solution with ' + nBreaks + ' breaks after ' + nTrials + ' trials');
		} else {
			console.log('no solution found. cant assign ', bestOrder[failedIdx]);
		}
	}
	return { failedIdx, nBreaks, bestOrder };
};

for (const testCase of ASSIGNABLE) {
	test(testCase.shortDesc, () => {
		console.log(testCase.longDesc);
		const { failedIdx, nBreaks } = execute_test(testCase.maxTrials, testCase.blocks, true);
		expect(failedIdx).to.equal(testCase.failedIdx);
		expect(nBreaks).to.equal(testCase.nBreaks);
	});
}

for (let i = 0; i < UNASSIGNABLE.length; i++) {
	test('unassignable case ' + (i + 1) + ' - no solutions', () => {
		console.log('unassignable case ' + i + ' - numBlocks: ' + UNASSIGNABLE[i].length);
		const { failedIdx } = execute_test(100, UNASSIGNABLE[i], true);
		expect(failedIdx).to.toBeGreaterThan(-1);
	});
}

const N_RANDOM_TESTS = 0;
const verbose = false;
if (N_RANDOM_TESTS > 0) {
	test('Informational Only: ' + N_RANDOM_TESTS + ' random tests', () => {
		let nBroken = 0;
		let nFail = 0;
		for (let i = 0; i < N_RANDOM_TESTS; i++) {
			const nFull = 1 + randI(nStart);
			const blocks = generateTestCase(nFull);
			if (verbose)
				console.log(blocks.length + ' blocks with >=' + nFull + ' full time slots');
			const { failedIdx, nBreaks } = execute_test(100, blocks, verbose);
			if (failedIdx > -1) nFail++;
			if (nBreaks > 0) nBroken++;
		}
		console.log('\nRANDOM TEST SUMMARY\n');
		console.log(N_RANDOM_TESTS + ' total random tests');
		console.log(nFail + ' total failed assignments');
		console.log(nBroken + ' total breaks');
	});
}
