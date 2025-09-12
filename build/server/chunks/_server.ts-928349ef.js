import { j as json } from './index-29bd59f7.js';
import { g as getXataClient } from './xata-old-ddfee38d.js';
import { d as convertFromXataToAppType } from './reservation-24e75460.js';
import { g as getXataUserDocWithFirebaseToken } from './firestore-df2a73b8.js';
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
import 'dayjs';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';
import './settingsManager-25266b11.js';
import './reservations-a581989b.js';
import './settings2-3108d47d.js';
import './user-7520bd1c.js';
import './assignRsvsToBuoys-33e33a44.js';
import 'lodash';
import 'objects-to-csv';
import 'firebase-admin';

const xata = getXataClient();
async function POST({ request }) {
  try {
    const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
    if (!xataUser || !xataUser.id) {
      return json({ status: "error", error: "User not found" });
    }
    const { date, category } = await request.json();
    const rawRsvs = await xata.db.Reservations.filter({
      date,
      category,
      status: {
        $any: ["confirmed", "pending"]
      }
    }).getAll();
    const reservations = await convertFromXataToAppType(rawRsvs);
    return json({ status: "success", reservations });
  } catch (error) {
    console.error("Error in getReservationsByDate", error);
    return json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export { POST };
//# sourceMappingURL=_server.ts-928349ef.js.map
