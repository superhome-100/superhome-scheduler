import type { Block } from '../src/lib/autoAssign/hourlyUtils';

const simplestCase: Block[] = [
	{
		startTime: 0,
		endTime: 4,
		width: 3,
		spacePath: [-1, -1, -1, -1],
		rsvs: []
	}
];

const typicalCase_oneFullTimeSlot: Block[] = [
	{
		startTime: 13,
		endTime: 16,
		width: 4,
		spacePath: [-1, -1, -1],
		rsvs: []
	},
	{
		startTime: 16,
		endTime: 19,
		width: 2,
		spacePath: [-1, -1, -1],
		rsvs: []
	},
	{ startTime: 23, endTime: 24, width: 1, spacePath: [-1], rsvs: [] },
	{ startTime: 23, endTime: 24, width: 4, spacePath: [-1], rsvs: [] },
	{
		startTime: 21,
		endTime: 24,
		width: 1,
		spacePath: [-1, -1, -1],
		rsvs: []
	},
	{
		startTime: 5,
		endTime: 10,
		width: 1,
		spacePath: [-1, -1, -1, -1, -1],
		rsvs: []
	},
	{
		startTime: 11,
		endTime: 15,
		width: 3,
		spacePath: [-1, -1, -1, -1],
		rsvs: []
	},
	{
		startTime: 10,
		endTime: 13,
		width: 1,
		spacePath: [-1, -1, -1],
		rsvs: []
	},
	{
		startTime: 8,
		endTime: 12,
		width: 1,
		spacePath: [-1, -1, -1, -1],
		rsvs: []
	},
	{
		startTime: 14,
		endTime: 21,
		width: 1,
		spacePath: [-1, -1, -1, -1, -1, -1, -1],
		rsvs: []
	}
];

const worstCase_allFull_noZeroBreakSolutions: Block[] = [
	{
		spacePath: [-1, -1, -1, -1, -1, -1],
		startTime: 18,
		endTime: 24,
		width: 2,
		rsvs: []
	},
	{
		spacePath: [-1, -1],
		startTime: 6,
		endTime: 8,
		width: 2,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 20, endTime: 21, width: 1, rsvs: [] },
	{
		spacePath: [-1, -1, -1],
		startTime: 2,
		endTime: 5,
		width: 4,
		rsvs: []
	},
	{
		spacePath: [-1, -1, -1],
		startTime: 19,
		endTime: 22,
		width: 2,
		rsvs: []
	},
	{
		spacePath: [-1, -1, -1, -1],
		startTime: 11,
		endTime: 15,
		width: 1,
		rsvs: []
	},
	{
		spacePath: [-1, -1],
		startTime: 19,
		endTime: 21,
		width: 1,
		rsvs: []
	},
	{
		spacePath: [-1, -1],
		startTime: 22,
		endTime: 24,
		width: 2,
		rsvs: []
	},
	{
		spacePath: [-1, -1, -1, -1],
		startTime: 8,
		endTime: 12,
		width: 4,
		rsvs: []
	},
	{
		spacePath: [-1, -1, -1, -1, -1, -1],
		startTime: 6,
		endTime: 12,
		width: 1,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 7, endTime: 8, width: 4, rsvs: [] },
	{
		spacePath: [-1, -1, -1],
		startTime: 16,
		endTime: 19,
		width: 4,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 23, endTime: 24, width: 3, rsvs: [] },
	{
		spacePath: [-1, -1, -1, -1, -1, -1, -1],
		startTime: 10,
		endTime: 17,
		width: 1,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 15, endTime: 16, width: 3, rsvs: [] },
	{
		spacePath: [-1, -1],
		startTime: 20,
		endTime: 22,
		width: 1,
		rsvs: []
	},
	{
		spacePath: [-1, -1],
		startTime: 19,
		endTime: 21,
		width: 1,
		rsvs: []
	},
	{
		spacePath: [-1, -1, -1, -1, -1, -1, -1],
		startTime: 9,
		endTime: 16,
		width: 1,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 6, endTime: 7, width: 3, rsvs: [] },
	{
		spacePath: [-1, -1, -1, -1, -1],
		startTime: 13,
		endTime: 18,
		width: 1,
		rsvs: []
	},
	{
		spacePath: [-1, -1, -1, -1],
		startTime: 0,
		endTime: 4,
		width: 3,
		rsvs: []
	},
	{
		spacePath: [-1, -1, -1, -1],
		startTime: 14,
		endTime: 18,
		width: 2,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 22, endTime: 23, width: 2, rsvs: [] },
	{
		spacePath: [-1, -1, -1],
		startTime: 3,
		endTime: 6,
		width: 1,
		rsvs: []
	},
	{
		spacePath: [-1, -1],
		startTime: 12,
		endTime: 14,
		width: 2,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 23, endTime: 24, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 21, endTime: 22, width: 3, rsvs: [] },
	{ spacePath: [-1], startTime: 14, endTime: 15, width: 2, rsvs: [] },
	{ spacePath: [-1], startTime: 1, endTime: 2, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 0, endTime: 1, width: 3, rsvs: [] },
	{
		spacePath: [-1, -1],
		startTime: 5,
		endTime: 7,
		width: 2,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 22, endTime: 23, width: 1, rsvs: [] },
	{
		spacePath: [-1, -1, -1, -1],
		startTime: 7,
		endTime: 11,
		width: 1,
		rsvs: []
	},
	{
		spacePath: [-1, -1],
		startTime: 1,
		endTime: 3,
		width: 1,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 18, endTime: 19, width: 2, rsvs: [] },
	{ spacePath: [-1], startTime: 1, endTime: 2, width: 2, rsvs: [] },
	{ spacePath: [-1], startTime: 12, endTime: 13, width: 3, rsvs: [] },
	{ spacePath: [-1], startTime: 4, endTime: 5, width: 3, rsvs: [] },
	{ spacePath: [-1], startTime: 0, endTime: 1, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 19, endTime: 20, width: 2, rsvs: [] },
	{ spacePath: [-1], startTime: 22, endTime: 23, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 5, endTime: 6, width: 4, rsvs: [] },
	{ spacePath: [-1], startTime: 13, endTime: 14, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 1, endTime: 2, width: 1, rsvs: [] },
	{
		spacePath: [-1, -1],
		startTime: 8,
		endTime: 10,
		width: 1,
		rsvs: []
	},
	{ spacePath: [-1], startTime: 5, endTime: 6, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 8, endTime: 9, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 13, endTime: 14, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 0, endTime: 1, width: 1, rsvs: [] },
	{ spacePath: [-1], startTime: 17, endTime: 18, width: 1, rsvs: [] }
];

type AssignHourlyTestDesc = {
	shortDesc: string;
	longDesc: string;
	blocks: Block[];
	maxTrials: number;
	failedIdx: number;
	nBreaks: number;
};

export const TESTS: AssignHourlyTestDesc[] = [
	{
		shortDesc: 'simplest case',
		longDesc: 'simplest case - 1 block',
		blocks: simplestCase,
		maxTrials: 1,
		failedIdx: -1,
		nBreaks: 0
	},
	{
		shortDesc: 'typical case',
		longDesc: 'typical case, 10 blocks, 1 full time slot',
		blocks: typicalCase_oneFullTimeSlot,
		maxTrials: 1,
		failedIdx: -1,
		nBreaks: 0
	},
	{
		shortDesc: 'worst case - no zero-break solutions',
		longDesc: 'worst case, 50 blocks, all time slots full, no zero-break solutions',
		blocks: worstCase_allFull_noZeroBreakSolutions,
		maxTrials: 100,
		failedIdx: -1,
		nBreaks: 4
	}
];
