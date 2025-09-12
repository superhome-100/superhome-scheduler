import { R as ReservationType } from './settings-a7eb4ae9.js';

const sortBuddies = (grp) => {
  return grp.sort((a, b) => b.maxDepth - a.maxDepth);
};
function sortBuddyGroups(buddyGrps) {
  return buddyGrps.map((g) => sortBuddies(g)).sort((a, b) => b[0].maxDepth - a[0].maxDepth);
}
function createBuddyGroups(rsvs) {
  let remaining = [...rsvs];
  let grps = [];
  let isBuddy = (a, b) => a.buddies.includes(b.user.id) && a.buoy == b.buoy;
  let sameBuoy = (a, b) => a.buoy != "auto" && a.buoy == b.buoy;
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
const largeDepthDifference = (deepBg, shallowBg, threshold) => {
  let deepBgMax = deepBg[0].maxDepth;
  let shallowBgMin = shallowBg[shallowBg.length - 1].maxDepth;
  return deepBgMax - shallowBgMin >= threshold;
};
const buoysMatch = (bgA, bgB) => {
  let buoyA = bgA[0].buoy;
  let buoyB = bgB[0].buoy;
  if ([buoyA, buoyB].includes("CBS") || [buoyA, buoyB].includes("PRO_SAFETY")) {
    return buoyA === buoyB;
  } else {
    return buoyA === "auto" || buoyB === "auto" || buoyA === buoyB;
  }
};
function createBuoyGroupsFromBuddyGroups(buddyGrps, maxDepthDiff) {
  const buoyGrps = [];
  for (let i = buddyGrps.length - 1; i >= 0; i--) {
    let bg = buddyGrps[i];
    if (bg[0].resType === ReservationType.course || bg.length >= 3) {
      buoyGrps.push(buddyGrps.splice(i, 1)[0]);
    }
  }
  const createBuoyGroup = (bgs, idxs) => {
    const bg = bgs.reduce((acc, g) => acc.concat(g), []);
    buoyGrps.push(sortBuddies(bg));
    for (let i of idxs.sort().reverse()) {
      buddyGrps.splice(i, 1);
    }
  };
  const matchOne = (curBg, searchIdx, diffThresh) => {
    if (searchIdx == buddyGrps.length) {
      if (curBg.length == 2) {
        createBuoyGroup([curBg], [0]);
      } else {
        forceAddSoloDiver(curBg[0]);
      }
    } else {
      let candidateBg = buddyGrps[searchIdx];
      if (buoysMatch(curBg, candidateBg)) {
        let n = curBg.length + candidateBg.length;
        if (largeDepthDifference(curBg, candidateBg, diffThresh)) {
          if (curBg.length == 2) {
            createBuoyGroup([curBg], [0]);
          } else {
            createBuoyGroup([curBg, candidateBg], [0, searchIdx]);
          }
        } else if (n == 2) {
          matchOneOrTwo({
            curBg,
            nextBg: candidateBg,
            nextBgIdx: searchIdx,
            searchIdx: searchIdx + 1,
            diffThresh
          });
        } else if (n == 3) {
          createBuoyGroup([curBg, candidateBg], [0, searchIdx]);
        } else {
          matchOne(curBg, searchIdx + 1, diffThresh);
        }
      } else {
        matchOne(curBg, searchIdx + 1, diffThresh);
      }
    }
  };
  const matchOneOrTwo = ({
    curBg,
    nextBg,
    nextBgIdx,
    searchIdx,
    diffThresh
  }) => {
    if (searchIdx == buddyGrps.length) {
      createBuoyGroup([curBg, nextBg], [0, nextBgIdx]);
    } else {
      let candidateBg = buddyGrps[searchIdx];
      if (largeDepthDifference(curBg, candidateBg, diffThresh)) {
        createBuoyGroup([curBg, nextBg], [0, nextBgIdx]);
      } else {
        if (buoysMatch(curBg, candidateBg)) {
          if (candidateBg.length == 1) {
            createBuoyGroup([curBg, nextBg, candidateBg], [0, nextBgIdx, searchIdx]);
          } else {
            createBuoyGroup([curBg, candidateBg], [0, searchIdx]);
          }
        } else {
          matchOneOrTwo({
            curBg,
            nextBg,
            nextBgIdx,
            searchIdx: searchIdx + 1,
            diffThresh
          });
        }
      }
    }
  };
  const forceAddSoloDiver = (solo) => {
    let added = false;
    for (let i = buoyGrps.length - 1; i >= 0; i--) {
      let grp = buoyGrps[i];
      if (buoysMatch(grp, [solo]) && grp[0].resType === ReservationType.autonomous) {
        if (grp.length == 2) {
          grp.push(solo);
        } else {
          let idx = grp.length - 1;
          if (grp.filter((rsv, i2) => rsv.buddies.length == 1).length > 0) {
            idx = grp.reduce((idx2, rsv, i2) => rsv.buddies.length == 0 ? i2 : idx2, idx);
          }
          let buddy = grp.splice(idx, 1)[0];
          buoyGrps.push([buddy, solo]);
        }
        added = true;
        break;
      }
    }
    if (!added) {
      buoyGrps.push([solo]);
    }
    buddyGrps.splice(0, 1);
  };
  while (buddyGrps.length > 0) {
    matchOne(buddyGrps[0], 1, maxDepthDiff);
  }
  return buoyGrps;
}
function createBuoyGroups(rsvs, maxDepthDiff) {
  let buddyGrps = createBuddyGroups(rsvs);
  return createBuoyGroupsFromBuddyGroups(buddyGrps, maxDepthDiff);
}
function getGroupOpts(grp) {
  let grpOpts = {
    pulley: null,
    // null = "no preference", false = "don't want pulley", true = "want pulley"
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
function countMatches(buoy, opts) {
  let m = 0;
  if (buoy.pulley && opts.pulley)
    m++;
  if (buoy.bottomPlate && opts.bottomPlate)
    m++;
  if (buoy.largeBuoy && opts.largeBuoy)
    m++;
  return m;
}
function assignPreAssigned(buoys, grps, assignments) {
  const getBuoy = (grp) => {
    return grp.reduce((buoy, rsv) => {
      return buoy === "auto" ? rsv.buoy : buoy;
    }, "auto");
  };
  for (let i = grps.length - 1; i >= 0; i--) {
    const grp = grps[i];
    const name = getBuoy(grp);
    if (name !== "auto") {
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
function sortByFewestExtraOpts(candidates, grpMaxDepth, grpOpts) {
  const numOpts = (opts) => {
    return (opts.pulley ? 1 : 0) + (opts.bottomPlate ? 1 : 0) + (opts.largeBuoy ? 1 : 0);
  };
  const numExtraOpts = (buoy) => Math.max(0, numOpts(buoy) - numOpts(grpOpts));
  const depthDiff = (buoy) => buoy.maxDepth - grpMaxDepth;
  candidates.sort(
    (a, b) => numExtraOpts(a.buoy) > numExtraOpts(b.buoy) ? 1 : numExtraOpts(b.buoy) > numExtraOpts(a.buoy) ? -1 : depthDiff(a.buoy) - depthDiff(b.buoy)
  );
}
function assignAuto(buoys, grps, assignments) {
  buoys.sort((a, b) => b.maxDepth - a.maxDepth);
  grps.sort((a, b) => a[0].maxDepth - b[0].maxDepth);
  while (grps.length > 0) {
    let grp = grps[grps.length - 1];
    let grpMaxDepth = grp[0].maxDepth;
    let grpOpts = getGroupOpts(grp);
    let requestNoPulley = grp[0].resType === "course" && grp[0].pulley == false;
    let candidates = buoys.map((buoy, idx) => {
      return { buoy, idx };
    });
    let deepEnough = candidates.filter((cand) => cand.buoy.maxDepth >= grpMaxDepth);
    if (deepEnough.length > 0) {
      candidates = deepEnough;
      if (requestNoPulley) {
        let noPulleyBuoys = candidates.filter((c) => c.buoy.pulley == false);
        if (noPulleyBuoys.length > 0) {
          candidates = noPulleyBuoys;
        }
      }
      let maxMatches = candidates.reduce((max, cand) => {
        let nMatches = countMatches(cand.buoy, grpOpts);
        return nMatches > max ? nMatches : max;
      }, 0);
      candidates = candidates.filter((cand) => countMatches(cand.buoy, grpOpts) == maxMatches);
      sortByFewestExtraOpts(candidates, grpMaxDepth, grpOpts);
    }
    let best = candidates[0];
    assignments[best.buoy.name] = grp;
    grps.splice(grps.length - 1, 1);
    buoys.splice(best.idx, 1);
    if (buoys.length == 0) {
      break;
    }
  }
}
function assignBuoyGroupsToBuoys(buoys, grps) {
  let assignments = {};
  let remainingBuoys = [...buoys];
  assignPreAssigned(remainingBuoys, grps, assignments);
  assignAuto(remainingBuoys, grps, assignments);
  return {
    assignments,
    unassigned: grps.reduce((flat, grp) => flat.concat(grp), [])
  };
}
function assignRsvsToBuoys(buoys, rsvs) {
  const shortSession = rsvs.filter((rsv) => rsv.shortSession);
  const longSession = rsvs.filter((rsv) => !rsv.shortSession);
  const maxDepthDiff = 15;
  const buoyGrps = [
    ...createBuoyGroups(shortSession, maxDepthDiff),
    ...createBuoyGroups(longSession, maxDepthDiff)
  ];
  return assignBuoyGroupsToBuoys(buoys, buoyGrps);
}
function setBuoyToReservations(buoys, rsvs) {
  const { assignments, unassigned } = assignRsvsToBuoys(buoys, rsvs);
  const tempSubmissions = [
    ...unassigned,
    ...Object.entries(assignments).flatMap(
      ([buoyName, rsvs2]) => (
        // _buoy prevents buoy from being saved but also allows O*n rendering is possible
        rsvs2.map((rsv) => ({ ...rsv, _buoy: buoyName }))
      )
    )
  ];
  return tempSubmissions;
}

export { assignRsvsToBuoys as a, setBuoyToReservations as s };
//# sourceMappingURL=assignRsvsToBuoys-33e33a44.js.map
