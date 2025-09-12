import { g as getBackUpZip } from './server-8060eee8.js';
import { g as getReservationsCsv } from './reservation-24e75460.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import 'objects-to-csv';
import 'jszip';
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
import './firestore-df2a73b8.js';
import 'firebase-admin';
import './user-7520bd1c.js';
import './assignRsvsToBuoys-33e33a44.js';
import 'lodash';

async function POST({ request }) {
  let { branch, table } = await request.json();
  if (table === "Reservations") {
    let csv = await getReservationsCsv(branch);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-type": "text/csv; charset=UTF-8",
        "Content-Disposition": `attachment; filename=reservations-${branch}.csv`
      }
    });
  } else {
    let zip = await getBackUpZip(branch);
    return zip.generateAsync({ type: "blob" }).then(function(content) {
      return new Response(content, {
        status: 200,
        headers: {
          "Content-type": "zip; charset=UTF-8",
          "Content-Disposition": `attachment; filename=${branch}.zip`
        }
      });
    });
  }
}

export { POST };
//# sourceMappingURL=_server-f9711253.js.map
