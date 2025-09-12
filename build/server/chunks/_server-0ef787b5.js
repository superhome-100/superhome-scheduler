import { g as getXataClient } from './xata-old-ddfee38d.js';
import { a as assignRsvsToBuoys } from './assignRsvsToBuoys-33e33a44.js';
import './datetimeUtils-b60811f0.js';
import './settings-a7eb4ae9.js';
import { j as json } from './index-29bd59f7.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import 'dayjs';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';
import './stores2-2fbb3163.js';
import './index2-be97e17a.js';
import './index3-9a6d7026.js';
import './firebase-abda0d73.js';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'axios';
import './settingsManager-25266b11.js';

const xata = getXataClient();
async function POST({ request }) {
  try {
    let { lock, date } = await request.json();
    let rsvs = await xata.db.Reservations.filter({
      date,
      category: "openwater",
      status: { $any: ["pending", "confirmed"] }
    }).getAll();
    rsvs = rsvs.map((rsv) => {
      return { ...rsv };
    });
    const updates = [];
    if (lock) {
      let buoys = await xata.db.Buoys.getAll();
      for (let owTime of ["AM", "PM"]) {
        const { assignments } = assignRsvsToBuoys(
          buoys,
          rsvs.filter((rsv) => rsv.owTime === owTime)
        );
        for (const buoy of buoys) {
          let toAsn = assignments[buoy.name];
          if (toAsn != void 0) {
            updates.push(
              ...toAsn.map((rsv) => {
                return { id: rsv.id, buoy: buoy.name };
              })
            );
          }
        }
      }
    } else {
      rsvs.forEach((rsv) => updates.push({ id: rsv.id, buoy: "auto" }));
    }
    let reservations = await xata.db.Reservations.update(updates);
    return json({ status: "success", reservations });
  } catch (error) {
    console.error("error lockBuoyAssignments", error);
    return json({ status: "error", error });
  }
}

export { POST };
//# sourceMappingURL=_server-0ef787b5.js.map
