import { g as getOWReservationAdminComments } from './ow-98e630d9.js';
import { j as json } from './index-29bd59f7.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

async function GET({ params }) {
  const adminComments = await getOWReservationAdminComments(params["date"]);
  return json(adminComments);
}

export { GET };
//# sourceMappingURL=_server.ts-f568e2ea.js.map
