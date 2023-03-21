import {
    dateStrParseDate,
    datetimeToLocalDateStr,
    timeGE,
    timeLT
} from '$lib/datetimeUtils.js';
import { reservations } from '$lib/stores.js'
import { get } from 'svelte/store';

export function monthArr(year, month, reservations) {
    let daysInMonth = new Date(year, month+1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay();
    let rows = Math.ceil((firstDay + daysInMonth)/7);
    let month_a = Array(rows)
        .fill()
        .map((w,w_i) => Array(7)
            .fill()
            .map(function(d,d_i) {
                let idx = w_i*7 + d_i;
                if (idx >= firstDay && idx - firstDay < daysInMonth) {
                    let day = 1 + idx - firstDay;
                    let dayRsvs = [];
                    for (let rsv of reservations) {
                        if (rsv.dateObj.year == year
                            && rsv.dateObj.month == month
                            && rsv.dateObj.day == day)
                        {
                            dayRsvs.push(rsv);
                        }
                    }
                    return { day: day, rsvs: dayRsvs };
                } else {
                    return null;
                }
            })
        );
    return month_a;
};

export function sortUserReservations(newRsvs, id, sorted={'past': [], 'upcoming': []}) {
    let now = datetimeToLocalDateStr(new Date());
    for (let rsv of newRsvs) {
        if (rsv.user.id === id) {
            let view = rsv.date >= now ? 'upcoming' : 'past';
            sorted[view].push(rsv);
        }
    }
    return sorted;
}

export function augmentRsv(rsv, fbId=null, name=null) {
    let newRsv = {
        ...rsv,
        dateObj: dateStrParseDate(rsv.date)
    };
    if (fbId) { newRsv.user['facebookId'] = fbId }
    if (name) { newRsv.user['name'] = name }
    return newRsv;
}

export function getDaySchedule(startTimes, rsvs, datetime, category, nResource) {
    let schedule = [];
    let today = datetimeToLocalDateStr(datetime);
    rsvs = rsvs.filter((v) => v.category === category && v.date === today);

    for (let t of startTimes) {
        let timeRsvs = Array(nResource).fill().map(() => []);
        let resource = 0;
        for (let rsv of rsvs) {
            if (timeGE(t, rsv.startTime)
                && timeLT(t, rsv.endTime))
            {
                let msg = rsv.user.name;
                if (rsv.resType === 'course') {
                    msg = `${msg} + ${rsv.numStudents}`;
                }
                timeRsvs[resource].push(msg);
                resource = (resource + 1) % nResource;
            }
        }
        schedule.push({start: t, rsvs: timeRsvs});
    }
    return schedule;
}

export function removeRsv(rsv) {
    let rsvs = get(reservations);
    for (let i=0; i < rsvs.length; i++) {
        if (rsv.id === rsvs[i].id) {
            rsvs.splice(i,1);
            reservations.set(rsvs);
            break;
        }
    }
}


