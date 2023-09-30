import { getXataClient } from '$lib/server/xata-old';
import ObjectsToCsv from 'objects-to-csv';
import JSZip from 'jszip';

const xata = getXataClient();

export async function getBackUpZip(branch: string) {
	let zip = new JSZip();
	let client = getXataClient(branch);
	for (let tbl in client.db) {
		if (Object.prototype.hasOwnProperty.call(client.db, tbl)) {
			const records = await client.db[tbl as keyof typeof client.db].getAll();
			const csv = new ObjectsToCsv(records);
			const csvStr = await csv.toString();
			zip.file(branch + '/' + tbl + '.csv', csvStr);
		}
	}
	return zip;
}

export async function getBuoys() {
	const buoys = await xata.db.Buoys.getAll();
	return buoys;
}

export async function getUserActiveNotifications(userId: string) {
	const receipts = await xata.db.NotificationReceipts.filter({ user: userId }).getAll();
	const notifications = await xata.db.Notifications.getAll();
	return notifications.filter((ntf) => {
		return (
			receipts.filter((rpt) => {
				return rpt?.notification?.id === ntf.id && rpt?.user?.id === userId;
			}).length == 0
		);
	});
}

export async function insertNotificationReceipt(notificationId: string, userId: string) {
	const record = await xata.db.NotificationReceipts.create({
		user: userId,
		notification: notificationId
	});
	return record;
}
