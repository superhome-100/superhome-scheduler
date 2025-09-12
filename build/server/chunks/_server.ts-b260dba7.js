import { j as json } from './index-29bd59f7.js';
import { g as getAllUsers } from './user-7520bd1c.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';

async function GET() {
  try {
    const [users] = await Promise.all([getAllUsers()]);
    const usersById = users.reduce((obj, user) => {
      obj[user.id] = user;
      return obj;
    }, {});
    return json({
      status: "success",
      usersById
    });
  } catch (error) {
    console.error(error);
    return json({ status: "error", error });
  }
}

export { GET };
//# sourceMappingURL=_server.ts-b260dba7.js.map
