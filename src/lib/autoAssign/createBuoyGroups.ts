import type { Buoys } from '$lib/server/xata.codegen';
import type { Submission } from '$types';

const sortBuddies = (grp: Submission[]) => {
	return grp.sort((a, b) => a.maxDepth - b.maxDepth);
};

function sortBuddyGroups(buddyGrps: Submission[][]) {
	return buddyGrps.map((g) => sortBuddies(g)).sort((a, b) => a[0].maxDepth - b[0].maxDepth);
}

function createBuddyGroups(rsvs: Submission[]) {
	let grps = [];
	let isBuddy = (a: Submission, b: Submission) => a.buddies.includes(b.user.id) && a.buoy == b.buoy;
	let sameBuoy = (a: Submission, b: Submission) => a.buoy != 'auto' && a.buoy == b.buoy;
	while (rsvs.length > 0) {
		let next = rsvs.splice(0, 1)[0];
		let bg = [next];
		for (let i = rsvs.length - 1; i >= 0; i--) {
			if (isBuddy(next, rsvs[i]) || sameBuoy(next, rsvs[i])) {
				bg.push(rsvs.splice(i, 1)[0]);
			}
		}
		grps.push(bg);
	}
	return sortBuddyGroups(grps);
}

// helper: try to avoid pairing buddies with maxDepths that differ by 'tooFar' meters
const depthsTooFar = (deepBg: Submission[], shallowBg: Submission[], tooFar: number) => {
	let deepBgMax = deepBg[0].maxDepth;
	let shallowBgMin = shallowBg[shallowBg.length - 1].maxDepth;
	return deepBgMax - shallowBgMin >= tooFar;
};

// helper: make sure buddies with pre-assigned buoys are consistent
const buoysMatch = (bgA: Submission[], bgB: Submission[]) => {
	if (
		[bgA[0].buoy, bgB[0].buoy].includes('CBS') ||
		[bgA[0].buoy, bgB[0].buoy].includes('PRO_SAFETY')
	) {
		return bgA[0].buoy === bgB[0].buoy;
	} else {
		return bgA[0].buoy === 'auto' || bgB[0].buoy === 'auto' || bgA[0].buoy === bgB[0].buoy;
	}
};

function createBuoyGroupsFromBuddyGroups(buddyGrps: Submission[][], maxDepthDiff: number) {
	const buoyGrps: Submission[][] = [];

	// first add all rsvs with resType==course or 3+ buddies to their own buoys
	for (let i = buddyGrps.length - 1; i >= 0; i--) {
		let bg = buddyGrps[i];
		if (bg[0].resType === 'course' || bg.length >= 3) {
			buoyGrps.push(buddyGrps[i]);
			buddyGrps.splice(i, 1);
		}
	}

	// buddyGrps now consists only of groups of 1 or 2 divers;
	// create buoy groups of 2 or 3 divers from the remaining groups

	// helper for creating a buoy group from buddy groups and updating buddyGrps
	const update = (bgs: Submission[][], idxs: number[]) => {
		const bg = bgs.reduce((acc, g) => acc.concat(g), []);
		buoyGrps.push(sortBuddies(bg));
		for (let i of idxs.sort().reverse()) {
			buddyGrps.splice(i, 1);
		}
	};

	// curBg has either one or two divers
	// This fn recursively looks for a good buddy group to combine with
	// curBg to (ideally) form a group of 3
	const matchOne = (curBg: Submission[], searchIdx: number, tooFar: number) => {
		if (searchIdx == buddyGrps.length) {
			// couldnt find a good group of 3
			if (curBg.length == 2) {
				update([curBg], [0]);
			} else {
				// cant have a group with only one diver; find the best existing buoyGroup
				// to add this diver to
				forceAddSoloDiver(curBg[0]);
			}
		} else {
			let candidateBg = buddyGrps[searchIdx];
			if (buoysMatch(curBg, candidateBg)) {
				let n = curBg.length + candidateBg.length;
				if (depthsTooFar(curBg, candidateBg, tooFar)) {
					if (curBg.length == 2) {
						// create a group of 2 rather than combine
						// buddies with disparate maxDepths
						update([curBg], [0]);
					} else {
						// curBg.length == 1 and we can't have a buoy with only one diver, so
						// we must resort to combining buddies with disparate maxDepths
						update([curBg, candidateBg], [0, searchIdx]);
					}
				} else if (n == 2) {
					matchOneOrTwo(curBg, candidateBg, searchIdx, searchIdx + 1, tooFar);
				} else if (n == 3) {
					update([curBg, candidateBg], [0, searchIdx]);
				} else {
					// n == 4
					matchOne(curBg, searchIdx + 1, tooFar);
				}
			} else {
				matchOne(curBg, searchIdx + 1, tooFar);
			}
		}
	};

	// curBg and nextBg both consist of one diver each.
	// This fn finds the best pair of 3 divers from subsequent buddy groups.
	// It could be curBg + nextBg + another group with one diver,
	// or curBg plus another group of two.
	const matchOneOrTwo = (
		curBg: Submission[],
		nextBg: Submission[],
		nextBgIdx: number,
		searchIdx: number,
		tooFar: number
	) => {
		if (searchIdx == buddyGrps.length) {
			// couldnt find a good group of 3, so create group of 2
			update([curBg, nextBg], [0, nextBgIdx]);
		} else {
			let candidateBg = buddyGrps[searchIdx];
			if (depthsTooFar(curBg, candidateBg, tooFar)) {
				// create group of 2 rather than combine buddies w/ disparate maxDepths
				update([curBg, nextBg], [0, nextBgIdx]);
			} else {
				if (buoysMatch(curBg, candidateBg)) {
					if (candidateBg.length == 1) {
						update([curBg, nextBg, candidateBg], [0, nextBgIdx, searchIdx]);
					} else {
						// candidateBg.length must equal 2
						update([curBg, candidateBg], [0, searchIdx]);
					}
				} else {
					matchOneOrTwo(curBg, nextBg, nextBgIdx, searchIdx + 1, tooFar);
				}
			}
		}
	};

	// edge case when there is a solo diver who does not pair up nicely
	// with any of the existing buoy groups
	const forceAddSoloDiver = (rsv: Submission) => {
		let added = false;
		for (let i = buoyGrps.length - 1; i >= 0; i--) {
			let buoyG = buoyGrps[i];
			if (buoysMatch(buoyG, [rsv]) && buoyG[0].resType === 'autonomous') {
				if (buoyG.length == 2) {
					buoyG.push(rsv);
				} else {
					//buoyG already has at least 3 divers
					let buoyA: Submission[], buoyB: Submission[];
					// if buoyG has a group-of-2 buddy group
					if (buoyG.filter((rsv) => rsv.buddies.length == 1).length > 0) {
						//split the non-group-of-2 buddy
						for (let j = 0; j < buoyG.length; j++) {
							if (buoyG[j].buddies.length == 0) {
								let buddy = buoyG.splice(j, 1)[0];
								buoyA = buoyG;
								buoyB = [buddy, rsv];
								break;
							}
						}
					} else {
						// just split off the top two divers
						buoyA = buoyG.slice(0, 2);
						buoyB = [buoyG[2], rsv];
					}
					buoyGrps.splice(i, 1);
					buoyGrps.push(buoyA!);
					buoyGrps.push(buoyB!);
				}
				added = true;
				break;
			}
		}
		if (!added) {
			// none of the existing groups are autonomous; create group of 1
			buoyGrps.push([rsv]);
		}
		buddyGrps.splice(0, 1);
	};

	while (buddyGrps.length > 0) {
		/*
        console.log('buddyGrps:');
        console.log(buddyGrps.map((bg)=> bg.map((rsv)=>rsv.maxDepth)));
        console.log('buoyGrps:');
        console.log(buoyGrps.map((bg)=> bg.map((rsv)=>rsv.maxDepth)));
        */
		const bg = buddyGrps[0];
		if (bg[0].resType === 'course') {
			update([bg], [0]);
		} else {
			matchOne(bg, 1, maxDepthDiff);
		}
	}
	/*
    console.log('buddyGrps:');
    console.log(buddyGrps.map((bg)=> bg.map((rsv)=>rsv.maxDepth)));
    console.log('buoyGrps:');
    console.log(buoyGrps.map((bg)=> bg.map((rsv)=>rsv.maxDepth)));
    */
	return buoyGrps;
}

export function createBuoyGroups(rsvs: Submission[], maxDepthDiff: number) {
	let buddyGrps = createBuddyGroups(rsvs);
	return createBuoyGroupsFromBuddyGroups(buddyGrps, maxDepthDiff);
}
