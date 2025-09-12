import { g as getSession } from './session-e56b1727.js';
import { j as json } from './index-29bd59f7.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

async function GET({ cookies }) {
  try {
    let user = void 0;
    let viewMode = "admin";
    let session = cookies.get("sessionid");
    if (session !== void 0) {
      let record = await getSession(session);
      if (record == void 0) {
        cookies.delete("sessionid", { path: "/" });
      } else {
        user = record.user;
        viewMode = record.viewMode;
      }
    }
    return json({
      status: "success",
      user,
      viewMode,
      photoURL: cookies.get("photo_url")
    });
  } catch (error) {
    return json({ status: "error", error });
  }
}

export { GET };
//# sourceMappingURL=_server.ts-af868f6b.js.map
