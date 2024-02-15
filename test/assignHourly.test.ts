import { test, expect } from 'vitest';
import type { Grid, Block } from '../src/lib/autoAssign/hourlyUtils';
import { assignBlockSpacePaths } from '../src/lib/autoAssign/assignHourlySpacesWithBreaks';
import { ReservationType, ReservationCategory } from '../src/types';
import BASIC_TESTS from './assignHourly.testcases.basic';
import FALLBACK_TESTS from './assignHourly.testcases.fallback';

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

	let rsvs: any[] = [];
	const width = 1 + randI(nLane / 2);
	if (Math.random() > 0.2) {
		rsvs.push({
			category: ReservationCategory.pool,
			resType: ReservationType.course,
			numStudents: Math.floor(width / 2)
		});
	} else {
		for (let i = 0; i < width; i++) {
			rsvs.push({ category: ReservationCategory.pool, resType: ReservationType.autonomous });
		}
	}
	let spacePath: number[] = Array(end - start).fill(-1);
	if (Math.random() > 1) {
		//pre-assign
		spacePath.fill(randI(nLane - width));
	}

	return {
		startTime: start,
		endTime: end,
		width,
		spacePath,
		rsvs
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
		addBlock(grid, blocks[i], i);
	}
	return grid;
};

const execute_test = (MAX_TRIALS: number, blocks: Block[], verbose = false) => {
	const result = assignBlockSpacePaths(blocks, nLane, nStart, MAX_TRIALS);

	if (verbose) {
		const grid = gridFromBlocks(blocks);
		printGrid(grid);
		if (result.failedIdx == -1) {
			console.log(
				'found solution for ' +
					blocks.length +
					' blocks with ' +
					result.nBreaks +
					' breaks after ' +
					result.nTrials +
					' trials'
			);
		} else {
			console.log("no solution found. can't assign ", result.bestOrder[result.failedIdx]);
		}
	}
	return result;
};

//
// Run the tests
//
const VERBOSE = true;
const ALL_TESTS = [...BASIC_TESTS, ...FALLBACK_TESTS];
for (const testCase of ALL_TESTS) {
	test(testCase.desc, () => {
		expect(testCase.blocks.length).to.equal(testCase.blocksIn);
		const { failedIdx, nBreaks } = execute_test(testCase.maxTrials, testCase.blocks, VERBOSE);
		expect(testCase.blocks.length).to.equal(testCase.blocksOut);
		expect(failedIdx).to.equal(-1);
		expect(nBreaks).to.equal(testCase.nBreaks);
	});
}

const N_RANDOM_TESTS = 1000;
if (N_RANDOM_TESTS > 0) {
	test(N_RANDOM_TESTS + ' random tests', () => {
		let nBroken = 0;
		let nFail = 0;
		let nSplit = 0;
		for (let i = 0; i < N_RANDOM_TESTS; i++) {
			const nFull = 1 + randI(nStart);
			const blocks = generateTestCase(nFull);
			const blocksIn = blocks.length;
			const { failedIdx, nBreaks } = execute_test(100, blocks, false);
			const blocksOut = blocks.length;
			if (failedIdx > -1) nFail++;
			if (nBreaks > 0) nBroken++;
			if (blocksOut > blocksIn) nSplit++;
		}
		console.log('\nRANDOM TEST SUMMARY\n');
		console.log(N_RANDOM_TESTS + ' total random tests');
		console.log(nFail + ' total failed assignments');
		console.log(nBroken + ' total assignments with breaks');
		console.log(nSplit + ' total assignments with group splits');
		expect(nFail).to.equal(0);
	});
}
