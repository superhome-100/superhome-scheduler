import {
    inc,
    startTimes,
} from '$lib/reservationTimes.js';
import { timeStrToMin } from '$lib/datetimeUtils.js';
import { nOccupants } from '$lib/validationUtils.js';
import { Settings } from '$lib/settings.js';

// priority rules:
//   1 pre-assigned rsvs
//          1.1 pre-assigned courses
//          1.2 pre-assigned buddies
//          1.3 pre-assigned solo
//   2 unassigned courses
//   3 unassigned buddies
//   4 unassigned solo
const sorted = (rsvs) => rsvs.sort((a,b) => a.resType === 'course'
    ? -1 : b.resType === 'course'
    ? 1 : a.buddies.length > b.buddies.length
    ? -1 : b.buddies.length > a.buddies.length
    ? 1 : 0
);

function sortByPriority(rsvs) {
    let owners = rsvs.filter(rsv => rsv.owner);
    for (let owner of owners) {
        owner.buddyRsvs = [];
        for (let buddy of owner.buddies) {
            let q = rsvs.filter(rsv => rsv.user.id === buddy
                && rsv.buddies.includes(owner.user.id)
                && rsv.startTime === owner.startTime
            );
            // length could be zero if buddy's rsv was rejected
            if (q.length == 1) {
                owner.buddyRsvs.push(q[0]);
            }
        }
    }
    let preAssigned = [], unAssigned = [];
    owners.forEach(rsv => {
        if (rsv.category === 'pool') {
            rsv.lanes[0] === 'auto' ? unAssigned.push(rsv) : preAssigned.push(rsv);
        } else if (rsv.category === 'classroom') {
            rsv.room == null ? unAssigned.push(rsv) : preAssigned.push(rsv);
        }
    });
    return { pre: sorted(preAssigned), un: sorted(unAssigned) };
}

function getMinBreaksPath(spacesByTimes, laneWidth, width, startTime, endTime) {
    let { path } = getMinBreaksPathRec(spacesByTimes, laneWidth, width, startTime, endTime, { breaks: 0, path: [] });
    return path;
}

function getMinBreaksPathRec(spacesByTimes, laneWidth, width, curTime, endTime, pathObj) {
    if (curTime === endTime) {
        return pathObj;
    }
    let minBreaks = Infinity;
    let bestPath = null;
    const allNull = (start) => {
        return [...Array(width).keys()].reduce((b, idx) => {
            return b && spacesByTimes[start + idx][curTime] == null
        }, true);
    };
    const sharedLane = (space) => {
        if (laneWidth > 1 && width == 1) {
            if (space % 2 == 0) {
                return spacesByTimes[space+1][curTime] != null;
            } else {
                return spacesByTimes[space-1][curTime] != null;
            }
        } else {
            return false;
        }
    };
    // startSpace will be undefined if curTime == startTime
    let startSpace = pathObj.path[pathObj.path.length-1];
    let sortedSteps = []
    for (let i=0; i <= spacesByTimes.length - width; i+=width) {
        if (allNull(i)) {
            let thisBreak = startSpace == null ? 0 : i == startSpace ? 0 : 1;
            thisBreak += sharedLane(i) ? 1 : 0;
            sortedSteps.push({i,thisBreak});
        }
    }
    sortedSteps.sort((a,b) => a.thisBreak > b.thisBreak ? 1 : b.thisBreak > a.thisBreak ? -1 : 0)
    for (let step of sortedSteps) {
        let thisPath = getMinBreaksPathRec(
            spacesByTimes,
            laneWidth,
            width,
            curTime+1,
            endTime,
            { breaks: step.thisBreak, path: [step.i] }
        );
        if (thisPath.path != null) {
            if (thisPath.breaks == 0) {
                // optimal path; stop the search and return this path immediately
                bestPath = thisPath;
                break;
            }
            else if (thisPath.breaks < minBreaks) {
                minBreaks = thisPath.breaks;
                bestPath = thisPath;
            }
        }
    }
    if (bestPath) {
        pathObj.breaks += bestPath.breaks;
        pathObj.path = pathObj.path.concat(bestPath.path);
    } else {
        pathObj.path = null;
    }
    return pathObj;
}

function rsvToBlock(rsv, minTime, inc, resourceNames) {
    let startTime = (timeStrToMin(rsv.startTime) - minTime) / inc;
    let endTime = (timeStrToMin(rsv.endTime) - minTime) / inc;
    let occ = Settings.get('maxOccupantsPerLane');
    let width = nOccupants([rsv], occ) + rsv.buddies.length;
    let startSpaces;
    if (rsv.category === 'pool') {
        startSpaces = rsv.lanes[0] !== 'auto'
            ? rsv.lanes.map(lane => occ*resourceNames.indexOf(lane))
            : null;
    } else if (rsv.category === 'classroom') {
        startSpaces =  rsv.room ? [resourceNames.indexOf(rsv.room)] : null;
    }

    return {
        rsv,
        startTime,
        endTime,
        width,
        startSpaces,
    };
}

function insertPreAssigned(spacesByTimes, blk) {
    let width = blk.width / Settings.get('maxOccupantsPerLane');
    for (let startSpace of blk.startSpaces) {
        for (let i=startSpace; i < startSpace + width; i++) {
            for (let j=blk.startTime; j < blk.endTime; j++) {
                spacesByTimes[i][j] = blk.rsv;
            }
        }
    }
}

function insertUnAssigned(spacesByTimes, laneWidth, blk) {
    let bestPath = getMinBreaksPath(spacesByTimes, laneWidth, blk.width, blk.startTime, blk.endTime);
    if (bestPath) {
        for (let time=blk.startTime; time < blk.endTime; time++) {
            let space = bestPath[time-blk.startTime];
            for (let i = space; i < space + blk.width; i++) {
                spacesByTimes[i][time] = blk.rsv;
            }
        }
    } else {
        return {
            status: 'error',
            code: 'OUT_OF_SPACE'
        }
    }
    return { status: 'success' }
}

export function assignPoolSpaces(rsvs, dateStr) {
    let incT = inc(Settings, dateStr);
    let sTs = startTimes(Settings, dateStr, 'pool');
    let nTimes = sTs.length;
    let minTime = timeStrToMin(sTs[0]);
    let laneWidth = Settings.get('maxOccupantsPerLane');
    let nSpaces = laneWidth * Settings.get('poolLanes').length
    let spacesByTimes = Array(nSpaces)
        .fill()
        .map(() => Array(nTimes).fill());

    let { pre, un } = sortByPriority(rsvs);
    let resourceNames = Settings.get('poolLanes', dateStr);

    let result = {
        status: 'success',
        schedule: spacesByTimes
    }
    for (let rsv of pre) {
        insertPreAssigned(spacesByTimes, rsvToBlock(rsv, minTime, incT, resourceNames));
    }
    for (let rsv of un) {
        let thisResult = insertUnAssigned(spacesByTimes, laneWidth, rsvToBlock(rsv, minTime, incT, resourceNames));
        if (thisResult.status === 'error') {
            result.status = 'error'
            result.code = thisResult.code;
            result.rsv = rsv;
        }
    }
    return result;
}

function dataAreDifferent(A, B) {
    let idsA = new Set(A.map(rsv => rsv.id));
    let idsB = new Set(B.map(rsv => rsv.id));
    if (idsA.size != idsB.size) {
        return true;
    }
    for (let id of idsA) {
        if (!idsB.has(id)) {
            return true;
        }
    }
    return false;
}

function patchData(sByT, i, t, laneWidth) {
    let data = [];
    let s0 = sByT[i][t];
    if (s0 != null) {
        data.push(s0);
        if (laneWidth > 1) {
            let s1 = sByT[i+1][t];
            if (s0.buddyRsvs.length > 0) {
                data.push(...s0.buddyRsvs);
            } else if (s1 != null && s1.id != s0.id) {
                data.push(s1);
            }
        }
    } else if (laneWidth > 1 && sByT[i+1][t] != null) {
        data.push(sByT[i+1][t]);
    }
    return data;
}

export function patchSchedule(sByT) {
    let schedule = Array(Settings.get('poolLanes').length).fill().map(()=> {
        return [{
            nSlots: 0,
            cls: 'filler',
            data: [],
        }];
    });
    let laneWidth = Settings.get('maxOccupantsPerLane');
    let nSlots = sByT[0].length;

    for (let t=0; t<nSlots; t++) {
        for (let lane=0; lane<schedule.length; lane++) {
            let i = lane*laneWidth;
            let data = patchData(sByT, i, t, laneWidth);
            let cls = data.length == 0 ? 'filler' : 'rsv';
            let curBlk = schedule[lane][schedule[lane].length-1];
            if (curBlk.cls != cls) {
                let blk = {
                    nSlots: 1,
                    cls,
                    data
                };
                schedule[lane].push(blk);
            } else if (cls === 'rsv') {
                if (dataAreDifferent(data, curBlk.data)) {
                    let blk = {
                        nSlots: 1,
                        cls,
                        data
                    };
                    schedule[lane].push(blk)
                } else {
                    curBlk.nSlots += 1;
                }
            } else {
                curBlk.nSlots += 1;
            }
        }
    }
    return schedule;
}

