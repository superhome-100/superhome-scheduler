import { getXataClient } from '$lib/server/xata-old';
import { addMissingFields, convertReservationTypes } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { beforeCancelCutoff, beforeResCutoff } from '$lib/reservationTimes';
import { Settings } from '$lib/settings';
import { initSettings } from '$lib/server/settings.js';
import { getTimeOverlapFilters } from '$utils/reservation-queries';
import {
	checkClassroomAvailable,
	checkPoolSpaceAvailable,
	checkOWSpaceAvailable,
	getStartTime,
	throwIfOverlappingReservation,
	throwIfPastUpdateTime,
	throwIfUserIsDisabled,
	ValidationError
} from '$utils/validation';
import { getUsersById } from './user';
import ObjectsToCsv from 'objects-to-csv';
import JSZip from 'jszip';

const xata = getXataClient();

export async function getBackUpZip(branch) {
	let zip = new JSZip();
	let client = getXataClient(branch);
	for (let tbl of Object.keys(client.db)) {
		const records = await client.db[tbl].getAll();
		const csv = new ObjectsToCsv(records);
		const csvStr = await csv.toString();
		zip.file(branch + '/' + tbl + '.csv', csvStr);
	}
	return zip;
}

export async function getBuoys() {
	let buoys = await xata.db.Buoys.getAll();
	return buoys;
}

export function checkSessionActive(route, cookies) {
	let session = cookies.get('sessionid');
	if (session === undefined) {
		if (route.id !== '/') {
			throw redirect(307, '/');
		}
	}
}

export async function getUserActiveNotifications(user) {
	const receipts = await xata.db.NotificationReceipts.filter({ user }).getAll();
	const notifications = await xata.db.Notifications.getAll();
	return notifications.filter((ntf) => {
		return (
			receipts.filter((rpt) => {
				return (
					rpt.user != null &&
					rpt.notification != null &&
					rpt.notification.id === ntf.id &&
					rpt.user.id === user
				);
			}).length == 0
		);
	});
}

export async function insertNotificationReceipt(notification, user) {
	let record = await xata.db.NotificationReceipts.create({ user, notification });
	return record;
}
