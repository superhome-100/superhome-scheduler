import { j as json } from './index-29bd59f7.js';
import { d as deleteSession } from './session-e56b1727.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

async function POST({ cookies }) {
  const session = cookies.get("sessionid");
  cookies.delete("sessionid", { path: "/" });
  try {
    await deleteSession(session);
    return json({ status: "success" });
  } catch (error) {
    return json({ status: "error", error });
  }
}

export { POST };
//# sourceMappingURL=_server.ts-1ab28a6b.js.map
