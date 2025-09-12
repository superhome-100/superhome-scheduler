import { g as getXataClient } from './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

const xata = getXataClient();
async function POST({ request, cookies }) {
  try {
    let { viewMode } = await request.json();
    let session = cookies.get("sessionid");
    if (session != void 0) {
      await xata.db.Sessions.update({ id: session, viewMode });
    }
    return new Response("View mode updated", { status: 200 });
  } catch (error) {
    return new Response("Could not update viewMode", { status: 500 });
  }
}

export { POST };
//# sourceMappingURL=_server-bb4f7c94.js.map
