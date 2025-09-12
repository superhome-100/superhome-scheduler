import { b as getUserByCookies } from './user-7520bd1c.js';
import { b as getUserActiveNotifications } from './server-8060eee8.js';
import { j as json } from './index-29bd59f7.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import 'objects-to-csv';
import 'jszip';

async function GET({ cookies }) {
  const user = await getUserByCookies(cookies);
  if (!user)
    throw new Error("no session");
  const notifications = await getUserActiveNotifications(user.id);
  return json(notifications);
}

export { GET };
//# sourceMappingURL=_server.ts-fc490d8b.js.map
