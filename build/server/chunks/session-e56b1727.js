import { g as getXataClient } from './xata-old-ddfee38d.js';

const xata = getXataClient();
async function getSession(id) {
  let records = await xata.db.Sessions.select(["*", "user"]).filter({ id }).getMany();
  return records[0];
}
async function deleteSession(id) {
  return await xata.db.Sessions.delete(id);
}
async function createSession(user) {
  return await xata.db.Sessions.create({
    user: user.id
  });
}

export { createSession as c, deleteSession as d, getSession as g };
//# sourceMappingURL=session-e56b1727.js.map
