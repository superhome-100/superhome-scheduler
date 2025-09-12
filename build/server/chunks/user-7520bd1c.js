import { g as getXataClient } from './xata-old-ddfee38d.js';

const xata = getXataClient();
async function getAllUsers() {
  const users = await xata.db.Users.getAll();
  return users;
}
async function addUser({
  firebaseUID,
  providerId,
  providerUserId,
  email,
  userName
}) {
  const record = await xata.db.Users.create({
    [providerId === "facebook.com" ? "facebookId" : "googleId"]: providerUserId,
    name: userName,
    nickname: userName,
    status: "disabled",
    email: email || null,
    firebaseUID
  });
  await xata.db.UserPriceTemplates.create({ user: record.id, priceTemplate: "regular" });
  return record;
}
async function updateUserEmailAndFirebaseUID(userId, email, firebaseUID) {
  const record = await xata.db.Users.update(userId, { email, firebaseUID });
  return record;
}
async function updateNickname(userId, nickname) {
  const record = await xata.db.Users.update(userId, { nickname });
  return record;
}
async function getUsersById(ids) {
  return await xata.db.Users.read(ids);
}
async function authenticateUser(data) {
  let userRecord;
  const isFacebook = data.providerId === "facebook.com";
  const email = data.email.trim().toLowerCase();
  const overwriteEmail = !isFacebook && data.userRecordId;
  if (overwriteEmail) {
    console.log("doing overwrite email", data.userRecordId, email, data.firebaseUID);
    const oldUserRecord = await xata.db.Users.read(data.userRecordId);
    if (oldUserRecord && oldUserRecord.email !== email) {
      await updateUserEmailAndFirebaseUID(data.userRecordId, email, data.firebaseUID);
    }
    userRecord = oldUserRecord;
  } else {
    const [providerMatch, emailMatch] = await Promise.all([
      isFacebook ? xata.db.Users.filter({ facebookId: data.userId }).getFirst() : xata.db.Users.filter({ googleId: data.userId }).getFirst(),
      email ? xata.db.Users.filter({ email }).getFirst() : null
    ]);
    if (!providerMatch && !emailMatch) {
      userRecord = await addUser({
        firebaseUID: data.firebaseUID,
        providerId: data.providerId,
        providerUserId: data.userId,
        email,
        userName: data.userName
      });
    } else if (!emailMatch && providerMatch) {
      if (!isFacebook) {
        await updateUserEmailAndFirebaseUID(providerMatch.id, email, data.firebaseUID);
      }
      userRecord = providerMatch;
    } else {
      userRecord = emailMatch || providerMatch;
    }
  }
  return userRecord;
}
async function getUserByEmail(email) {
  const users = await xata.db.Users.filter({ email }).getAll();
  let user = users[0];
  if (users.length > 1) {
    user = users.find((u) => u.status === "active") || users[0];
  }
  return user;
}
async function getUserByFirebaseUID(firebaseUID) {
  const users = await xata.db.Users.filter({ firebaseUID }).getAll();
  users[0];
  if (users.length > 1) {
    users.find((u) => u.status === "active") || users[0];
  }
  return users[0];
}
async function getUserByFacebookId(facebookId) {
  const user = await xata.db.Users.filter({ facebookId }).getFirst();
  return user;
}
async function getUserByCookies(cookies) {
  const sessionID = cookies.get("sessionid");
  if (!sessionID)
    return void 0;
  let record = await xata.db.Sessions.read(sessionID);
  if (record == void 0) {
    return void 0;
  }
  return await xata.db.Users.read(record.user);
}

export { authenticateUser as a, getUserByCookies as b, getUsersById as c, getUserByEmail as d, getUserByFirebaseUID as e, getUserByFacebookId as f, getAllUsers as g, updateNickname as u };
//# sourceMappingURL=user-7520bd1c.js.map
