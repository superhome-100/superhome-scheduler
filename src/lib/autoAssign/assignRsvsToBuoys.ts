import type { Buoys } from '$lib/server/xata.codegen';
import type { Submission } from '$types';
import { createBuoyGroups } from './createBuoyGroups';

function getGroupOpts(grp: Submission[]) {
	let grpOpts: { [key: string]: boolean | null } = {
		pulley: null, // null = "no preference", false = "don't want pulley", true = "want pulley"
		bottomPlate: false,
		largeBuoy: false
	};
	for (let rsv of grp) {
		grpOpts.pulley = grpOpts.pulley || rsv.pulley;
		grpOpts.bottomPlate = grpOpts.bottomPlate || rsv.bottomPlate;
		grpOpts.largeBuoy = grpOpts.largeBuoy || rsv.largeBuoy;
	}
	return grpOpts;
}

type BuoyOpts = ReturnType<typeof getGroupOpts>;

function countMatches(buoy: Buoys, opts: BuoyOpts) {
	let m = 0;
	if (buoy.pulley && opts.pulley) m++;
	if (buoy.bottomPlate && opts.bottomPlate) m++;
	if (buoy.largeBuoy && opts.largeBuoy) m++;
	return m;
}

function assignBuoyGroupsToBuoys(buoys: Buoys[], grps: Submission[][]) {
	const assignments: { [buoyName: string]: Submission[] } = {};
	const getBuoy = (grp: Submission[]) => {
		return grp.reduce((buoy, rsv) => {
			return buoy !== 'auto' ? buoy : rsv.buoy ? rsv.buoy : 'auto';
		}, 'auto');
	};

	// first assign pre-assigned buoys
	for (let i = grps.length - 1; i >= 0; i--) {
		const grp = grps[i];
		const name = getBuoy(grp);
		if (name !== 'auto') {
			for (let j = buoys.length - 1; j >= 0; j--) {
				if (buoys[j].name === name) {
					assignments[name] = grp;
					grps.splice(i, 1);
					buoys.splice(j, 1);
					break;
				}
			}
		}
	}

	buoys.sort((a, b) => (a.maxDepth! < b.maxDepth! ? 1 : -1));
	grps.sort((a, b) => (a[0].maxDepth > b[0].maxDepth ? 1 : -1));

	// iterate from deepest to shallowest
	while (grps.length > 0) {
		const grp = grps[grps.length - 1];
		const checkNoPulley = grp[0].resType === 'course' && grp[0].pulley == false;
		let candidates = buoys.map((buoy, idx) => {
			return { buoy, idx };
		});
		if (checkNoPulley) {
			let noPulleys = candidates.filter((c) => c.buoy.pulley == false);
			if (noPulleys.length > 0) {
				candidates = noPulleys;
			}
		}

		if (candidates.length > 0) {
			// first find buoys with most option matches
			let grpOpts = getGroupOpts(grp);
			const calcScore = (cand: { buoy: Buoys; idx: number }) => {
				// rather than forbiding assignment of a buoy with a max depth less
				// than the group's max depth, we allow it in cases when no other
				// buoys of adequate depth are available via the depthPenalty
				let depthPenalty = Math.min(0, 2 * (cand.buoy.maxDepth! - grp[0].maxDepth));
				return depthPenalty + countMatches(cand.buoy, grpOpts);
			};
			let optScore = candidates.reduce((c, cand) => Math.max(c, calcScore(cand)), -Infinity);
			candidates = candidates.filter((cand) => calcScore(cand) == optScore);
			// then select the one among these buoys with fewest additional opts
			// and closest maxDepth
			const numOpts = (opts: Buoys | BuoyOpts) => {
				return (opts.pulley ? 1 : 0) + (opts.bottomPlate ? 1 : 0) + (opts.largeBuoy ? 1 : 0);
			};
			const additionalOpts = (buoy: Buoys) => Math.max(0, numOpts(buoy) - numOpts(grpOpts));
			const depthDiff = (buoy: Buoys) => buoy.maxDepth! - grp[0].maxDepth;
			candidates.sort((a, b) =>
				additionalOpts(a.buoy) > additionalOpts(b.buoy)
					? 1
					: additionalOpts(b.buoy) > additionalOpts(a.buoy)
					? -1
					: depthDiff(a.buoy) > depthDiff(b.buoy)
					? 1
					: -1
			);
			let best = candidates[0];
			assignments[best.buoy.name!] = grp;
			grps.splice(grps.length - 1, 1);
			buoys.splice(best.idx, 1);
		} else {
			return {
				status: 'error',
				message: 'Ran out of buoys',
				assignments
			};
		}
	}
	return { status: 'success', assignments };
}

export function assignRsvsToBuoys(buoys: Buoys[], rsvs: Submission[]) {
	// filter shortSession and longSession rsvs into separate groups so
	// that they are assigned to separate buoys
	let rsvsByDuration: Submission[][] = [[], []];
	rsvs.forEach((rsv) => {
		if (rsv.shortSession) rsvsByDuration[0].push(rsv);
		else rsvsByDuration[1].push(rsv);
	});

	// try to avoid assigning divers with max depths that differ by
	// more than maxDepthDiff to the same buoy; if no better option
	// is available, divers may still be assigned to the same buoy
	const maxDepthDiff = 15;

	let buoyGrps: Submission[][] = [];
	for (let rsvsDur of rsvsByDuration) {
		buoyGrps = buoyGrps.concat(createBuoyGroups(rsvsDur, maxDepthDiff));
	}
	let result = assignBuoyGroupsToBuoys([...buoys], buoyGrps);

	return result;
}
