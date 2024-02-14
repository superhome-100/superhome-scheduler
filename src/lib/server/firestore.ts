import { FIREBASE_SERVICE_ACCOUNT_KEY, XATA_BRANCH } from '$env/static/private';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount)
	});
}

const firestore = admin.firestore();

// xata does not support ACID grade transaction yet
// so we need to implement our own custom transaction we will just use firestore doc locking
export async function doTransaction(category: string, transaction: () => Promise<void>) {
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
}
