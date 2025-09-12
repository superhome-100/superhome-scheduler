import { g as getXataClient } from './xata-old-ddfee38d.js';
import { j as json } from './index-29bd59f7.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

const xata = getXataClient();
async function GET({ params }) {
  try {
    const date = params["date"];
    const boatAssignments = await xata.db.Boats.filter({
      id: date
    }).getFirst();
    const assignments = boatAssignments?.assignments ? JSON.parse(boatAssignments.assignments) : {};
    return json({ status: "success", assignments });
  } catch (error) {
    return json({ status: "error", error });
  }
}

export { GET };
//# sourceMappingURL=_server.ts-b916823a.js.map
