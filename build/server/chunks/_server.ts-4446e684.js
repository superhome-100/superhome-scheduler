import { j as json } from './index-29bd59f7.js';
import { c as createSession } from './session-e56b1727.js';
import { a as authenticateUser } from './user-7520bd1c.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

async function POST({ cookies, request }) {
  try {
    const { userId, userName, photoURL, email, providerId, firebaseUID, userRecordId } = await request.json();
    const record = await authenticateUser({
      userRecordId,
      userId,
      userName,
      email,
      providerId,
      firebaseUID
    });
    const sessionId = cookies.get("sessionid");
    if (!sessionId && record) {
      const session = await createSession(record);
      let expires = /* @__PURE__ */ new Date();
      expires.setMonth(expires.getMonth() + 1);
      cookies.set("sessionid", session.id, { path: "/", expires });
      cookies.set("photo_url", photoURL, { path: "/", expires });
    }
    return json({ status: "success", record });
  } catch (error) {
    console.error(error);
    return json({ status: "error", error });
  }
}

export { POST };
//# sourceMappingURL=_server.ts-4446e684.js.map
