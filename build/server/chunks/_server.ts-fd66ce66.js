import { j as json } from './index-29bd59f7.js';
import { g as getXataClient } from './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

const xata = getXataClient();
async function POST({ request }) {
  try {
    const { date, assignments } = await request.json();
    console.log("assignBuoysToBoats", date, assignments);
    const record = await xata.db.Boats.createOrUpdate({
      id: date,
      assignments: JSON.stringify(assignments)
    });
    return json({ status: "success", record });
  } catch (error) {
    console.error("error assignBuoysToBoats", error);
    return json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export { POST };
//# sourceMappingURL=_server.ts-fd66ce66.js.map
