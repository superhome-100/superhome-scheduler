import type { Buoys, OWReservation, OWSubmission, Submission } from '$types';
import { createBuoyGroups } from './createBuoyGroups';

function getGroupOpts(grp: OWSubmission[]) {
	let grpOpts: { [key: string]: boolean | null } = {
		pulley: null, // null = "no preference", false = "don't want pulley", true = "want pulley"
		bottomPlate: false,
		largeBuoy: false
	};
	for (let rsv of grp) {
		grpOpts.pulley = grpOpts.pulley ?? rsv.pulley ?? null;
		grpOpts.bottomPlate = grpOpts.bottomPlate ?? rsv.bottomPlate ?? null;
		grpOpts.largeBuoy = grpOpts.largeBuoy ?? rsv.largeBuoy ?? null;
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

function assignPreAssigned(
	buoys: Buoys[],
	grps: OWReservation[][],
	assignments: { [buoyName: string]: OWReservation[] }
) {
	const getBuoy = (grp: OWReservation[]): string => {
		return grp.reduce((buoy, rsv) => {
			return buoy === 'auto' ? rsv.buoy : buoy;
		}, 'auto');
	};

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
}

function sortByFewestExtraOpts(
	candidates: { buoy: Buoys; idx: number }[],
	grpMaxDepth: number,
	grpOpts: BuoyOpts
) {
	const numOpts = (opts: Buoys | BuoyOpts) => {
		return (opts.pulley ? 1 : 0) + (opts.bottomPlate ? 1 : 0) + (opts.largeBuoy ? 1 : 0);
	};
	const numExtraOpts = (buoy: Buoys) => Math.max(0, numOpts(buoy) - numOpts(grpOpts));
	const depthDiff = (buoy: Buoys) => buoy.maxDepth! - grpMaxDepth;

	candidates.sort((a, b) =>
		numExtraOpts(a.buoy) > numExtraOpts(b.buoy)
			? 1
			: numExtraOpts(b.buoy) > numExtraOpts(a.buoy)
				? -1
				: depthDiff(a.buoy) - depthDiff(b.buoy)
	);
}

function assignAuto(
	buoys: Buoys[],
	grps: OWSubmission[][],
	assignments: { [buoy: string]: Submission[] }
) {
	// sort buoys from deep to shallow
	buoys.sort((a, b) => b.maxDepth! - a.maxDepth!);
	// sort grps from shallow to deep (will iterate backwards)
	grps.sort((a, b) => a[0].maxDepth - b[0].maxDepth);

	while (grps.length > 0) {
		// find the optimal buoy for this group
		// "optimal" means:
		//      if at least one remaining buoy has maxDepth >= grpMaxDepth:
		//          the buoy with the most option matches and fewest extra/non-requested options
		//      else:
		//          the buoy with largest maxDepth
		let grp = grps[grps.length - 1];
		let grpMaxDepth = grp[0].maxDepth;
		let grpOpts = getGroupOpts(grp);
		let requestNoPulley = grp[0].resType === 'course' && grp[0].pulley == false;

		let candidates = buoys.map((buoy, idx) => {
			return { buoy, idx };
		});

		let deepEnough = candidates.filter((cand) => cand.buoy.maxDepth! >= grpMaxDepth);

		if (deepEnough.length > 0) {
			candidates = deepEnough;

			// no-pulley requests are more important than other options
			if (requestNoPulley) {
				let noPulleyBuoys = candidates.filter((c) => c.buoy.pulley == false);
				if (noPulleyBuoys.length > 0) {
					candidates = noPulleyBuoys;
				}
			}

			// filter by buoys with most option matches
			let maxMatches = candidates.reduce((max, cand) => {
				let nMatches = countMatches(cand.buoy, grpOpts);
				return nMatches > max ? nMatches : max;
			}, 0);
			candidates = candidates.filter((cand) => countMatches(cand.buoy, grpOpts) == maxMatches);

			// of these, choose the one with fewest extra opts and closest maxDepth
			sortByFewestExtraOpts(candidates, grpMaxDepth, grpOpts);
		} else {
			// all remaining buoys are less than group maxDepth
			// candidates[0] will be the buoy with largest maxDepth
		}

		let best = candidates[0];
		assignments[best.buoy.name!] = grp;
		grps.splice(grps.length - 1, 1);
		buoys.splice(best.idx, 1);

		if (buoys.length == 0) {
			// ran out of buoys
			break;
		}
	}
}

function assignBuoyGroupsToBuoys(buoys: Buoys[], grps: OWReservation[][]) {
	let assignments: { [buoy: string]: OWReservation[] } = {};
	let remainingBuoys = [...buoys];

	// remainingBuoys, grps, and assignments are modified in-place
	assignPreAssigned(remainingBuoys, grps, assignments);
	assignAuto(remainingBuoys, grps, assignments);

	return {
		assignments,
		unassigned: grps.reduce((flat, grp) => flat.concat(grp), [])
	};
}

export function assignRsvsToBuoys(buoys: Buoys[], rsvs: OWReservation[]) {
	// filter shortSession and longSession rsvs into separate groups so
	// that they are assigned to separate buoys
	const shortSession = rsvs.filter((rsv) => rsv.shortSession);
	const longSession = rsvs.filter((rsv) => !rsv.shortSession);

	// try to avoid assigning divers with max depths that differ by
	// more than maxDepthDiff to the same buoy; if no better option
	// is available, divers may still be assigned to the same buoy
	const maxDepthDiff = 15;

	// sorted group of divers whose depths are close enough
	const buoyGrps: OWReservation[][] = [
		...createBuoyGroups(shortSession, maxDepthDiff),
		...createBuoyGroups(longSession, maxDepthDiff)
	];

	return assignBuoyGroupsToBuoys(buoys, buoyGrps);
}

type TempSubmission = OWReservation & { _buoy?: string }; // _buoy is the suggested buoy not final
export function setBuoyToReservations(buoys: Buoys[], rsvs: OWReservation[]): TempSubmission[] {
	const { assignments, unassigned } = assignRsvsToBuoys(buoys, rsvs);
	const tempSubmissions = [
		...unassigned,
		...Object.entries(assignments).flatMap(([buoyName, rsvs]) =>
			// _buoy prevents buoy from being saved but also allows O*n rendering is possible
			rsvs.map((rsv) => ({ ...rsv, _buoy: buoyName }))
		)
	];
	return tempSubmissions;
}
