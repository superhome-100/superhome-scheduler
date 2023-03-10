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
                        if (rsv.date.year == year
                            && rsv.date.month == month
                            && rsv.date.day == day)
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

export function sortUserReservations(reservations) {
    let rsvs = {'past': [], 'upcoming': []};
    let now = new Date().toISOString();
    let i = 0;
    for (let rsv of reservations) {
        let view = rsv.dateISO >= now ? 'upcoming' : 'past';
        rsvs[view].push({...rsv, svelteId: i++});
    }
    return rsvs;
}
