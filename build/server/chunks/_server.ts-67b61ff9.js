import { j as json } from './index-29bd59f7.js';
import crypto from 'crypto';
import { b as private_env } from './shared-server-b7e48788.js';

function base64UrlDecode(input) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function parseSignedRequest(signedRequest, appSecret) {
  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload)
    return null;
  const sig = base64UrlDecode(encodedSig);
  const dataJson = base64UrlDecode(payload).toString("utf8");
  const data = JSON.parse(dataJson);
  if (!data.algorithm || String(data.algorithm).toUpperCase() !== "HMAC-SHA256") {
    return null;
  }
  const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();
  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    return null;
  }
  return data;
}
async function POST({ request, url }) {
  try {
    const appSecret = private_env.FACEBOOK_APP_SECRET;
    if (!appSecret) {
      console.error("FACEBOOK_APP_SECRET is not set");
      return json({ error: "server_misconfigured" }, { status: 500 });
    }
    let signed_request;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      signed_request = body?.signed_request;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      signed_request = String(form.get("signed_request") || "");
    } else {
      try {
        const body = await request.json();
        signed_request = body?.signed_request;
      } catch {
        const form = await request.formData();
        signed_request = String(form.get("signed_request") || "");
      }
    }
    if (!signed_request) {
      return json({ error: "missing_signed_request" }, { status: 400 });
    }
    const data = parseSignedRequest(signed_request, appSecret);
    if (!data) {
      return json({ error: "invalid_signed_request" }, { status: 400 });
    }
    const user_id = data.user_id;
    console.log("Facebook data deletion requested for user_id:", user_id);
    const confirmation_code = crypto.randomBytes(8).toString("hex");
    const statusUrl = new URL("/facebook/data-deletion-status", url);
    statusUrl.searchParams.set("id", confirmation_code);
    return json({ url: statusUrl.toString(), confirmation_code });
  } catch (err) {
    console.error("Error handling FB data deletion callback:", err);
    return json({ error: "internal_error" }, { status: 500 });
  }
}

export { POST };
//# sourceMappingURL=_server.ts-67b61ff9.js.map
