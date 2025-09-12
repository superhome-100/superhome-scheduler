import { g as getXataClient } from './xata-old-ddfee38d.js';
import { j as json } from './index-29bd59f7.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

const xata = getXataClient();
async function GET() {
  try {
    let assignments = await xata.db.Boats.getAll();
    assignments = assignments.reduce((obj, ent) => {
      obj[ent.id] = JSON.parse(ent.assignments);
      return obj;
    }, {});
    return json({ status: "success", assignments });
  } catch (error) {
    return json({ status: "error", error });
  }
}

export { GET };
//# sourceMappingURL=_server-d86a7c0f.js.map
