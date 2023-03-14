import { dateStrParseDate, datetimeToLocalDateStr } from '$lib/ReservationTimes.js';

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
                    let thisRsv = null;
                    for (let rsv of reservations) {
                        if (rsv.dateObj.year == year
                            && rsv.dateObj.month == month
                            && rsv.dateObj.day == day)
                        {
                            thisRsv = rsv;
                            break;
                        }
                    }
                    return { day: day, rsv: thisRsv };
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
