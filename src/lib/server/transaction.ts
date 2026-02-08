
/*  Previously there were a firebase locking mechanism here based on https://firebase.google.com/docs/firestore/manage-data/transactions
	The core logic looked like (see git for details):
	```
	if (['pool', 'classroom'].includes(category)) {
		const doc = firestore.collection('locks').doc([category, FIREBASE_BRANCH].join('_'));
		await firestore.runTransaction(async (t) => {
			await t.get(doc);
			await transaction();
			await t.set(doc, {
				updated_at: admin.firestore.FieldValue.serverTimestamp()
			});
		});
	} else {
		result = await transaction();
	}
	```
	Was said that the reason "probably related to buoy assignments and pool collision" and "book with multiple users at the same time for the same service and day".
	In the supabase system we will handle the possibility with a `version` column and retry but keep the function call for awareness to know what to search for if there are some problem in the future.
	Since it's a single server app just add a global mutex here: https://www.npmjs.com/package/async-mutex
 */
export async function doTransaction<T>(
	category: string,
	date: string,
	transaction: () => Promise<T>
): Promise<T> {
	return await transaction();
}
