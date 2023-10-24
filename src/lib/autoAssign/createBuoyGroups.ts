import type { Buoys } from '$lib/server/xata.codegen';
import type { Submission } from '$types';

const sortBuddies = (grp: Submission[]) => {
	//deepest to shallowest
	return grp.sort((a, b) => b.maxDepth - a.maxDepth);
};

function sortBuddyGroups(buddyGrps: Submission[][]) {
	//deepest to shallowest
	return buddyGrps.map((g) => sortBuddies(g)).sort((a, b) => b[0].maxDepth - a[0].maxDepth);
}

//group submissions by buddies and/or divers who are pre-assigned to the same buoy
function createBuddyGroups(rsvs: Submission[]) {
	let remaining = [...rsvs];
	let grps = [];
	let isBuddy = (a: Submission, b: Submission) => a.buddies.includes(b.user.id) && a.buoy == b.buoy;
	let sameBuoy = (a: Submission, b: Submission) => a.buoy != 'auto' && a.buoy == b.buoy;
	while (remaining.length > 0) {
		let next = remaining.splice(0, 1)[0];
		let bg = [next];
		for (let i = remaining.length - 1; i >= 0; i--) {
			if (isBuddy(next, remaining[i]) || sameBuoy(next, remaining[i])) {
				bg.push(remaining.splice(i, 1)[0]);
			}
		}
		grps.push(bg);
	}
	return sortBuddyGroups(grps);
}

// helper: try to avoid pairing buddies with maxDepths that differ by 'threshold' meters
const largeDepthDifference = (deepBg: Submission[], shallowBg: Submission[], threshold: number) => {
	let deepBgMax = deepBg[0].maxDepth;
	let shallowBgMin = shallowBg[shallowBg.length - 1].maxDepth;
	return deepBgMax - shallowBgMin >= threshold;
};

// helper: make sure buoy assignments are consistent before merging two buddy groups
const buoysMatch = (bgA: Submission[], bgB: Submission[]) => {
	let buoyA = bgA[0].buoy;
	let buoyB = bgB[0].buoy;
	if ([buoyA, buoyB].includes('CBS') || [buoyA, buoyB].includes('PRO_SAFETY')) {
		return buoyA === buoyB;
	} else {
		return buoyA === 'auto' || buoyB === 'auto' || buoyA === buoyB;
	}
};

function createBuoyGroupsFromBuddyGroups(buddyGrps: Submission[][], maxDepthDiff: number) {
	const buoyGrps: Submission[][] = [];

	// first add all rsvs with resType==course or 3+ buddies to their own buoys
	for (let i = buddyGrps.length - 1; i >= 0; i--) {
		let bg = buddyGrps[i];
		if (bg[0].resType === 'course' || bg.length >= 3) {
			buoyGrps.push(buddyGrps.splice(i, 1)[0]);
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

	// This fn recursively looks for a good buddy group to combine with
	// curBg to (ideally) form a group of 3
	// Note: curBg has either one or two divers
	const matchOne = (curBg: Submission[], searchIdx: number, diffThresh: number) => {
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
				if (largeDepthDifference(curBg, candidateBg, diffThresh)) {
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
					matchOneOrTwo(curBg, candidateBg, searchIdx, searchIdx + 1, diffThresh);
				} else if (n == 3) {
					update([curBg, candidateBg], [0, searchIdx]);
				} else {
					// n == 4
					matchOne(curBg, searchIdx + 1, diffThresh);
				}
			} else {
				matchOne(curBg, searchIdx + 1, diffThresh);
			}
		}
	};

	// This fn finds the best group of 3 divers from subsequent buddy groups.
	// It could be curBg + nextBg + another group with one diver,
	// or curBg plus another group of two
	// Note: curBg and nextBg both consist of one diver each
	const matchOneOrTwo = (
		curBg: Submission[],
		nextBg: Submission[],
		nextBgIdx: number,
		searchIdx: number,
		diffThresh: number
	) => {
		if (searchIdx == buddyGrps.length) {
			// couldnt find a good group of 3, so create group of 2
			update([curBg, nextBg], [0, nextBgIdx]);
		} else {
			let candidateBg = buddyGrps[searchIdx];
			if (largeDepthDifference(curBg, candidateBg, diffThresh)) {
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
					matchOneOrTwo(curBg, nextBg, nextBgIdx, searchIdx + 1, diffThresh);
				}
			}
		}
	};

	// edge case when there is a solo diver who does not pair up nicely
	// with any of the existing buoy groups
	const forceAddSoloDiver = (solo: Submission) => {
		let added = false;
		//iterate from shallowest to deepest
		for (let i = buoyGrps.length - 1; i >= 0; i--) {
			let grp = buoyGrps[i];
			if (buoysMatch(grp, [solo]) && grp[0].resType === 'autonomous') {
				if (grp.length == 2) {
					grp.push(solo);
				} else {
					//grp already has at least 3 divers
					let buoyA: Submission[], buoyB: Submission[];
					if (grp.filter((rsv) => rsv.buddies.length == 1).length > 0) {
						//this group has a pair of buddies that requested to dive together
						//Note: this also means that the group size must be exactly 3
						//      because groups of 4 are only possible when 4 buddies request
						//      to dive together
						//keep the two buddies together and split off the third diver
						for (let j = 0; j < grp.length; j++) {
							if (grp[j].buddies.length == 0) {
								let buddy = grp.splice(j, 1)[0];
								buoyA = grp;
								buoyB = [buddy, solo];
								break;
							}
						}
					} else {
						// split off the last diver
						buoyA = grp.slice(0, grp.length - 1);
						buoyB = [grp[grp.length - 1], solo];
					}
					buoyGrps.splice(i, 1);
					buoyGrps.push(buoyA!);
					buoyGrps.push(buoyB!);
				}
				added = true;
				break;
			} //buoysMatch
		}
		if (!added) {
			// none of the existing groups are autonomous; create group of 1
			buoyGrps.push([solo]);
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
