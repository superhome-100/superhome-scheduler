import {
    inc,
    startTimes,
    endTimes
} from '$lib/ReservationTimes.js';
import { datetimeToLocalDateStr, timeStrToMin } from '$lib/datetimeUtils.js';
import { timeOverlap, nOccupants } from '$lib/utils.js';
import { Settings } from '$lib/settings.js';

function assignUpToSoftCapacity(rsvs, category, dateStr, softCapacity, sameResource) {
    let schedule = Array(softCapacity).fill();
    let incT = inc(dateStr);
    let count = 0;
    let maxOccupants = Settings('maxOccupantsPerLane', dateStr);
    // assign courses first (put them at the end) to ensure they get their own lane
    // then assign buddies next to ensure they are paired in the same lane
    rsvs.sort((a,b) => a.resType === 'course'
        ? 1 : b.resType === 'course'
        ? -1 : a.buddies.length > b.buddies.length
        ? 1 : b.buddies.length > a.buddies.length
        ? -1 : timeStrToMin(a.startTime) > timeStrToMin(b.startTime)
        ? 1 : -1
    );
    // helper hidden var for splitting courses into multiple lanes when necessary
    for (let rsv of rsvs) {
        if (rsv.resType === 'course') {
            rsv.hiddenStudents = rsv.numStudents;
        }
    }
    while (rsvs.length > 0 && count < softCapacity) {
        let nextTime = timeStrToMin(startTimes(dateStr, category)[0]);
        let thisR = [];
        for (let j=rsvs.length-1; j >= 0; j--) {
            let rsv = rsvs[j];
            if (sameResource(count, rsv)) {
                let start = timeStrToMin(rsv.startTime);
                if (start >= nextTime) {
                    if (start > nextTime) {
                        thisR.push({
                            start: nextTime,
                            end: start,
                            nSlots: (start - nextTime) / incT,
                            cls: 'filler',
                            data: [],
                        });
                    }
                    nextTime = timeStrToMin(rsv.endTime);
                    let nSlots = (nextTime - start) / incT;
                    let block = {
                        start,
                        end: nextTime,
                        nSlots,
                        cls: 'rsv',
                        data: [rsv],
                        resType: rsv.resType
                    };
                    // split courses with >maxOccupants students into multiple lanes
                    if (
                        category === 'pool'
                        && rsv.resType === 'course'
                        && rsv.hiddenStudents > maxOccupants
                    ) {
                        rsv.hiddenStudents -= maxOccupants;
                        j++;
                    } else {
                        rsvs.splice(j,1);

                        if (rsv.buddies.length > 0) {
                            for (let i=0; i<rsvs.length; i++) {
                                let cand = rsvs[i];
                                if (rsv.buddies.includes(cand.user.id)) {
                                    block.data.push(cand);
                                    rsvs.splice(i,1);
                                    j--;
                                    break;
                                }
                            }
                        }
                    }
                    thisR.push(block);
                }
            }
        }

        let end = timeStrToMin(endTimes(dateStr, category)[endTimes(dateStr, category).length-1]);
        if (nextTime < end) {
            thisR.push({
                start: nextTime,
                end: end,
                nSlots: (end-nextTime) / incT,
                cls: 'filler',
                data: [],
            });
        }
        schedule[count] = thisR;
        count++;
    }
    return schedule;
}

function assignOverflowCapacity(rsvs, schedule, dateStr, softCapacity, sameResource) {

    const bestLane = (rsv) => {
        let start = timeStrToMin(rsv.startTime);
        let end = timeStrToMin(rsv.endTime);
        for (let resource of schedule) {
            let ideal = true;
            for (let block of resource.filter(blk => blk.cls === 'rsv')) {
                if (
                    timeOverlap(start, end, block.start, block.end)
                    && nOccupants(block.data) >= 2
                ) {
                    ideal = false;
                    break;
                };
            }
            if (ideal) { return resource; }
        }
        nextR = (nextR + 1) % softCapacity;
        return schedule[nextR];
    };

    let incT = inc(dateStr);
    let nextR = -1;
    let nextRsv = true;
    let start;
    let attempts = 0;

    while (rsvs.length > 0) {
        let rsv = rsvs[0];
        let end = timeStrToMin(rsv.endTime)

        if (nextRsv) {
            start = timeStrToMin(rsv.startTime);
            nextRsv = false;
        }

        let resource = bestLane(rsv);

        for (let j=0; j < resource.length; j++) {
            let block = resource[j];
            let blockClass = block.cls;
            let nRsv = block.data.length;
            if (block.resType != 'course'
                && nRsv < 2    // in case buddy has already been paired
                && sameResource(nextR, rsv)
                && start >= block.start
                && start < block.end
            ) {
                if (start > block.start) {
                    // break off beginning of existing block into its own block
                    let begBlock = {...block};
                    begBlock.end = start;
                    begBlock.nSlots = (start - block.start) / incT;
                    begBlock.cls = blockClass;
                    begBlock.data = [...block.data];
                    resource.splice(j, 0, begBlock);
                    j++;
                }

                block.start = start;
                block.nSlots = (block.end - start) / incT;
                block.cls = 'rsv';
                block.data.push(rsv);

                if (end <= block.end) {
                    if (end < block.end) {
                        // break off end of existing block into its own block
                        let endBlock = {...block};
                        endBlock.start = end;
                        endBlock.nSlots = (block.end - end) / incT;
                        endBlock.cls = blockClass;
                        endBlock.data = endBlock.data.slice(0,nRsv);
                        resource.splice(j+1, 0, endBlock);
                        j++;

                        block.end = end;
                        block.nSlots = (end - block.start) / incT;
                    }

                    // rsv has now been fully added, remove from list
                    rsvs.splice(0, 1);
                    nextRsv = true;
                    break;

                } else {
                    start = block.end;
                }
            }
        }
        if (!nextRsv) {
            attempts += 1;
        }
        if (attempts == schedule.length) {
            return {
                status: 'error',
                code: 'OUT_OF_RESOURCES',
                schedule,
            }
        }
    }
    return {
        status: 'success',
        schedule,
    }
}

export function getDaySchedule(rsvs, datetime, category, softCapacity) {

    let today = datetimeToLocalDateStr(datetime);
    rsvs = rsvs.filter((v) => v.status != 'rejected' && v.category === category && v.date === today);
    rsvs.sort((a,b) => timeStrToMin(a.startTime) < timeStrToMin(b.startTime) ? 1 : -1);

    let sameResource;
    if (category === 'pool') {
        sameResource = (idx, rsv) => rsv.pool_lane == null || rsv.pool_lane == idx+1;
    } else if (category === 'classroom') {
        sameResource = (idx, rsv) => rsv.room == null || rsv.room == (2-idx)+1;
    }

    let schedule = assignUpToSoftCapacity(rsvs, category, today, softCapacity, sameResource);

    if (category === 'classroom') {
        // we prioritize assigning to classroom 3, then 2, then 1 if necessary
        schedule.reverse();
    }

    let result = assignOverflowCapacity(rsvs, schedule, today, softCapacity, sameResource);

    return result;
}
