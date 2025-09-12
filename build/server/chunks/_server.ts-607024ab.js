import { j as json } from './index-29bd59f7.js';
import { g as getXataClient } from './xata-old-ddfee38d.js';
import { d as convertFromXataToAppType } from './reservation-24e75460.js';
import { g as getXataUserDocWithFirebaseToken } from './firestore-df2a73b8.js';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import './settings-a7eb4ae9.js';
import './stores2-2fbb3163.js';
import './index2-be97e17a.js';
import './index3-9a6d7026.js';
import './firebase-abda0d73.js';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'axios';
import './datetimeUtils-b60811f0.js';
import 'dayjs/plugin/utc.js';
import './settingsManager-25266b11.js';
import './reservations-a581989b.js';
import './settings2-3108d47d.js';
import './user-7520bd1c.js';
import './assignRsvsToBuoys-33e33a44.js';
import 'lodash';
import 'objects-to-csv';
import 'firebase-admin';

dayjs.extend(timezone);
const xata = getXataClient();
const daysLimit = 60;
async function GET({ request }) {
  try {
    const now = dayjs().tz("Asia/Manila");
    const inXDays = now.clone().add(daysLimit, "days");
    const dateArray = [];
    let currentDate = now;
    while (currentDate.isBefore(inXDays)) {
      dateArray.push(currentDate.format("YYYY-MM-DD"));
      currentDate = currentDate.add(1, "day");
    }
    const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
    const rawRsvs = await xata.db.Reservations.filter({
      // @ts-ignore
      user: xataUser.id,
      date: { $any: dateArray },
      status: { $any: ["confirmed", "pending"] }
    }).getAll();
    const reservations = await convertFromXataToAppType(rawRsvs);
    return json({ status: "success", reservations });
  } catch (error) {
    return json({ status: "error", error });
  }
}

export { GET };
//# sourceMappingURL=_server.ts-607024ab.js.map
