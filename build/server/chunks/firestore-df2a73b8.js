import { F as FIREBASE_SERVICE_ACCOUNT_KEY, b as XATA_BRANCH } from './xata.codegen-95200588.js';
import admin from 'firebase-admin';
import { d as getUserByEmail, e as getUserByFirebaseUID, f as getUserByFacebookId } from './user-7520bd1c.js';
import dayjs from 'dayjs';

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const firestore = admin.firestore();
async function doTransaction(category, date, transaction) {
  if (["pool", "classroom"].includes(category)) {
    const doc = firestore.collection("locks").doc([category, XATA_BRANCH].join("_"));
    await firestore.runTransaction(async (t) => {
      await t.get(doc);
      await transaction();
      await t.set(doc, {
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  } else {
    await transaction();
  }
  try {
    const docName = `${category}_${date}_${XATA_BRANCH === "main" ? "prod" : "dev"}`;
    const doc = firestore.collection("locks").doc(docName);
    await doc.set(
      {
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error(error);
  }
}
async function getXataUserDocWithFirebaseToken(headers) {
  const authorizationHeader = headers.get("authorization") || "";
  const token = authorizationHeader.split("Bearer ")[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  const fbUser = await admin.auth().getUser(decodedToken.uid);
  if (!fbUser)
    throw new Error("firebase user not found!");
  let user;
  if (fbUser.email) {
    user = await getUserByEmail(fbUser.email);
  }
  if (!user && fbUser.uid) {
    user = await getUserByFirebaseUID(fbUser.uid);
  }
  if (!user) {
    const facebookId = fbUser.providerData.find((p) => p.providerId === "facebook.com")?.uid;
    if (!facebookId)
      throw new Error("facebookId not found!");
    user = await getUserByFacebookId(facebookId);
  }
  if (!user)
    throw new Error("user not found!");
  return user;
}
async function getDateSetting(date) {
  const stage = process.env.PUBLIC_STAGE || "prod";
  const docName = `date_settings_${stage}/${dayjs(date).format("YYYY-MM-DD")}`;
  return (await firestore.doc(docName).get()).data();
}

export { getDateSetting as a, doTransaction as d, getXataUserDocWithFirebaseToken as g };
//# sourceMappingURL=firestore-df2a73b8.js.map
