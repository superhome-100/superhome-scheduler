import { XataClient } from '$lib/server/xata.codegen.server.js';

const XATA_API_KEY='xau_9xJINLTWEBX1d0EyWIi7YL9QinLT2TEv1';
const xata = new XataClient({ apiKey: XATA_API_KEY, branch: 'dev' });

//import { getXataClient } from '$lib/server/xata.js';
//const xata = getXataClient();

import {
    datetimeToDateStr,
    datetimeInPanglao,
    timeStrToMin,
    firstOfMonthStr,
} from '$lib/datetimeUtils.js';
import { Settings } from '$lib/server/settings.js';

const unpackTemplate = (uT) => {
    return {
        pool: {
            course: uT.priceTemplate.coachPool,
            autonomous: uT.priceTemplate.autoPool,
        },
        classroom: {
            course: uT.priceTemplate.coachClassroom,
        },
        openwater: {
            course: uT.priceTemplate.coachOW,
            autonomous: uT.priceTemplate.autoOW,
        }
    };
}

function currentTimeActive(settings, date, time) {
    let starts = [
        settings.get('minPoolStartTime', date),
        settings.get('minClassroomStartTime', date),
        settings.get('openwaterAmStartTime', date)
    ].map(tm => timeStrToMin(tm));
    let ends = [
        settings.get('maxPoolEndTime', date),
        settings.get('maxClassroomEndTime', date),
        settings.get('openwaterPmEndTime', date)
    ].map(tm => timeStrToMin(tm));

    // true if current time is beyond the minimum possible rsv start time
    // and is before the maximum possible rsv end time
    return starts.reduce((b,tm) => b || time >= tm, false)
        && ends.reduce((b, tm) => b || time <= tm, false);
}

async function getOldAndNewRsvs(date) {
    let reservations = await xata.db.Reservations
        .filter({
            status: 'confirmed',
            date: { $le: date, $ge: firstOfMonthStr(date) },
        }).getAll();

    let oldRsvs = reservations.filter(rsv => rsv.price != null);
    let newRsvs = reservations.filter(rsv => rsv.price == null);
    return { oldRsvs, newRsvs };
}

async function getTemplates(newRsvs) {
    let uIds = Array.from(new Set(newRsvs.map(rsv => rsv.user.id)));
    let userTemplates = await xata.db.UserPriceTemplates
        .filter({ user: { $any : uIds }})
        .select(['user', 'priceTemplate'])
        .getAll();
    return userTemplates;
}

const calcNAutoOW = (user, oldRsvs) => {
    return oldRsvs.filter(rsv => {
        return rsv.user.id === user
            && rsv.resType === 'autonomous'
            && rsv.category === 'openwater'
    }).length;
};

const getStart = (rsv, amOWTime, pmOWTime) => {
    return ['pool', 'classroom'].includes(rsv.category)
        ? timeStrToMin(rsv.startTime)
        : rsv.category === 'openwater'
            ? rsv.owTime === 'AM'
                ? amOWTime
                : pmOWTime
            : undefined;
};

export async function POST() {
    try {
        await Settings.init();

        let d = datetimeInPanglao();
        let date = datetimeToDateStr(d);
        let time = d.getHours()*60 + d.getMinutes();
        let maxChgbl = Settings.get('maxChargeableOWPerMonth', date);
        let amOWStart = timeStrToMin(Settings.get('openwaterAmStartTime', date));
        let pmOWStart = timeStrToMin(Settings.get('openwaterPmStartTime', date));

        let { oldRsvs, newRsvs } = await getOldAndNewRsvs(date);
        if (newRsvs.length > 0) {
            let updates = [];
            let userTemplates = await getTemplates(newRsvs);

            for (let uT of userTemplates) {
                let tmp = unpackTemplate(uT);
                let nAutoOW = calcNAutoOW(uT.user.id, oldRsvs);
                let rsvs = newRsvs.filter(rsv => rsv.user.id === uT.user.id);
                for (let rsv of rsvs) {
                    let start = getStart(rsv, amOWStart, pmOWStart);
                    if (rsv.date < date || (rsv.date === date && start <= time)) {
                        let price;
                        if (
                            rsv.category === 'openwater'
                            && rsv.resType === 'autonomous'
                        ) {
                            nAutoOW++;
                            if (nAutoOW > maxChgbl) {
                                price = 0;
                            } else {
                                price = tmp[rsv.category][rsv.resType];
                            }
                        } else {
                            price = tmp[rsv.category][rsv.resType];
                            if (rsv.resType === 'course') {
                                price *= rsv.numStudents;
                            }
                        }
                        updates.push({id: rsv.id, price });
                    }
                }
            }
            if (updates.length > 0) {
                await xata.db.Reservations.update(updates);
            }
        }
        //return new Response('prices updated', { status: 200 });
    } catch (error) {
        console.log(error);
        //return new Response(error, { status: 500 });
    }
}
