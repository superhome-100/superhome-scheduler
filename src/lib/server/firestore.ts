import { FIREBASE_SERVICE_ACCOUNT_KEY, XATA_BRANCH } from '$env/static/private';
import admin from 'firebase-admin';
import { getUserByEmail, getUserByFirebaseUID, getUserByFacebookId } from './user';

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount)
	});
}

const firestore = admin.firestore();

// xata does not support ACID grade transaction yet
// so we need to implement our own custom transaction we will just use firestore doc locking
export async function doTransaction(
	category: string,
	date: string,
	transaction: () => Promise<void>
) {
	if (['pool', 'classroom'].includes(category)) {
		const doc = firestore.collection('locks').doc([category, XATA_BRANCH].join('_'));
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
		const docName = `${category}_${date}_${XATA_BRANCH === 'main' ? 'prod' : 'dev'}`;
		const doc = firestore.collection('locks').doc(docName);
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

export async function getXataUserDocWithFirebaseToken(headers: Headers) {
	const authorizationHeader = headers.get('authorization') || '';
	const token = authorizationHeader.split('Bearer ')[1];
	const decodedToken = await admin.auth().verifyIdToken(token);
	const fbUser = await admin.auth().getUser(decodedToken.uid);
	if (!fbUser) throw new Error('firebase user not found!');

	let user;
	if (fbUser.email) {
		user = await getUserByEmail(fbUser.email);
	}

	if (!user && fbUser.uid) {
		user = await getUserByFirebaseUID(fbUser.uid);
	}

	if (!user) {
		const facebookId = fbUser.providerData.find((p) => p.providerId === 'facebook.com')?.uid;
		if (!facebookId) throw new Error('facebookId not found!');
		user = await getUserByFacebookId(facebookId);
	}

	if (!user) throw new Error('user not found!');

	return user;
}
