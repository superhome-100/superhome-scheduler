import { getXataClient } from '$lib/server/xata-old';
import { addMissingFields, convertReservationTypes } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { beforeCancelCutoff, beforeResCutoff } from '$lib/reservationTimes.js';
import { Settings } from '$lib/server/settings';
import { getTimeOverlapFilters } from '$utils/reservation-queries';
import {
	checkClassroomAvailable,
	checkPoolSpaceAvailable,
	checkOWSpaceAvailable,
	getStartTime,
	throwIfOverlappingReservation,
	throwIfPastUpdateTime,
	ValidationError
} from '$utils/validation';
import { getUserById } from './user';
import ObjectsToCsv from 'objects-to-csv';
import JSZip from 'jszip';
import { categoryIsBookable } from './reservation';

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

export async function getSettings() {
	let settingsTbl = await xata.db.Settings.getAll();
	let buoys = await xata.db.Buoys.getAll();
	return { settingsTbl, buoys };
}

async function getOverlappingReservations(sub) {
	await Settings.init();
	let filters = {
		date: sub.date,
		$any: getTimeOverlapFilters(Settings, sub),
		status: { $any: ['pending', 'confirmed'] }
	};
	let existing = await xata.db.Reservations.filter(filters).getAll();
	return existing;
}

async function getUserOverlappingReservations(sub, userIds) {
	let existing = await getOverlappingReservations(sub);
	return existing.filter((rsv) => userIds.includes(rsv.user.id));
}

async function throwIfNoSpaceAvailable(settings, sub, overlappingRsvs, ignore = []) {
	let result;
	let rsvs = overlappingRsvs
		.filter((rsv) => rsv.category === sub.category && !ignore.includes(rsv.id))
		.map((rsv) => {
			return { ...rsv };
		}); // remove const

	if (sub.category === 'openwater') {
		let buoys = await xata.db.Buoys.getAll();
		result = checkOWSpaceAvailable(buoys, sub, rsvs);
	} else if (sub.category === 'pool') {
		result = checkPoolSpaceAvailable(settings, sub, rsvs);
	} else if (sub.category === 'classroom') {
		result = checkClassroomAvailable(settings, sub, rsvs);
	}
	if (result.status === 'error') {
		throw new ValidationError(result.message);
	}
}

// TODO: move this to a reservation.ts file apply appropriate type shape
export async function submitReservation(formData) {
	await Settings.init();
	let sub = convertReservationTypes(Object.fromEntries(formData));

	if (!Settings.get('openForBusiness', sub.date)) {
		throw new ValidationError('We are closed on this date; please choose a different date');
	}

	if (!categoryIsBookable(sub)) {
		throw new ValidationError(
			`The ${sub.category} is not bookable on this date; please choose a different date`
		);
	}

	const user = await getUserById(sub.user.id);
	if (user.status === 'disabled') {
		throw new ValidationError(
			'User does not have permission to use this app; please contact the admin for help'
		);
	}
	if (!beforeResCutoff(Settings, sub.date, getStartTime(Settings, sub), sub.category)) {
		throw new ValidationError(
			'The submission window for this reservation date/time has expired. Please choose a later date.'
		);
	}

	let allOverlappingRsvs = await getOverlappingReservations(sub);

	let userIds = [sub.user.id, ...sub.buddies];
	let userOverlappingRsvs = allOverlappingRsvs.filter((rsv) => userIds.includes(rsv.user.id));
	if (userOverlappingRsvs.length > 0) {
		throw new ValidationError(
			'Reservation rejected!  You or one of your buddies has a pre-existing reservation at this time'
		);
	}

	// openwater bookings require the admin to manually confirm
	sub.status = sub.category === 'openwater' ? 'pending' : 'confirmed';

	if (sub.resType === 'cbs') {
		sub.buoy = 'CBS';
	}

	// since lanes is of type 'multiple' in the db, it cant have a
	// default value, so we set the default here
	sub.lanes = ['auto'];

	let entries = [sub];
	if (sub.buddies.length > 0) {
		let { user, buddies, ...common } = sub;
		for (let id of buddies) {
			let bg = [user, ...buddies.filter((bid) => bid != id)];
			entries.push({ ...common, user: id, buddies: bg, owner: false });
		}
	}

	await throwIfNoSpaceAvailable(Settings, sub, allOverlappingRsvs);

	let records = await xata.db.Reservations.create(entries);
	return {
		status: 'success',
		records
	};
}

export async function updateReservation(formData) {
	let { oldBuddies, ...sub } = convertReservationTypes(Object.fromEntries(formData));
	oldBuddies = oldBuddies ? oldBuddies : [];

	let orig = await xata.db.Reservations.read(sub.id);

	addMissingFields(sub, orig);

	await Settings.init();
	throwIfPastUpdateTime(Settings, orig, sub);

	let allOverlappingRsvs = await getOverlappingReservations(sub);

	// check that the submitter and associated buddies do not have existing
	// reservations that will overlap with the updated reservation
	let userIds = [sub.user.id, ...sub.buddies];
	throwIfOverlappingReservation(orig, allOverlappingRsvs, userIds);

	sub.owner = true; // the submitter assumes ownership
	sub.status = sub.category === 'openwater' ? 'pending' : 'confirmed';
	sub.buoy = sub.resType === 'cbs' ? 'CBS' : 'auto'; // assignment reverts to auto when rsv is modified

	let buddySet = new Set(sub.buddies);
	for (let id of oldBuddies) {
		buddySet.add(id);
	}

	let updatedAt = new Date();
	let modify = [{ ...sub, updatedAt }];
	let create = [];
	let cancel = [];

	if (buddySet.size > 0) {
		let existingBuddies;
		let { user, buddies, ...common } = sub;

		delete common.id;
		delete common.createdAt;
		delete common.updatedAt;

		if (oldBuddies.length > 0) {
			existingBuddies = await getUserOverlappingReservations(orig, oldBuddies);
		}

		for (let bId of buddySet) {
			if (buddies.includes(bId) && oldBuddies.includes(bId)) {
				// modify
				let rsvId = existingBuddies.filter((rsv) => rsv.user.id === bId)[0].id;
				let bg = [user.id, ...buddies.filter((bIdp) => bIdp != bId)];
				let entry = {
					...common,
					updatedAt,
					id: rsvId,
					user: bId,
					buddies: bg,
					owner: false
				};
				modify.push(entry);
			} else if (buddies.includes(bId)) {
				// create
				let bg = [user.id, ...buddies.filter((bIdp) => bIdp != bId)];
				let entry = {
					...common,
					updatedAt,
					createdAt: updatedAt,
					user: bId,
					buddies: bg,
					owner: false
				};
				create.push(entry);
			} else {
				// cancel
				let rsvId = existingBuddies.filter((rsv) => rsv.user.id === bId)[0].id;
				cancel.push(rsvId);
			}
		}
	}

	await throwIfNoSpaceAvailable(Settings, sub, allOverlappingRsvs, [
		...modify.filter((rsv) => rsv.id),
		...cancel
	]);

	let records = {
		created: [],
		canceled: []
	};

	let modrecs = await xata.db.Reservations.update(modify);
	records.modified = modrecs;
	if (create.length > 0) {
		let createrecs = await xata.db.Reservations.create(create);
		records.created = createrecs;
	}
	if (cancel.length > 0) {
		let cancelrecs = await xata.db.Reservations.update(
			cancel.map((id) => {
				return { id, status: 'canceled' };
			})
		);
		records.canceled = cancelrecs;
	}
	return {
		status: 'success',
		records
	};
}

export async function adminUpdate(formData) {
	let rsv = {};
	let id = formData.get('id');
	rsv.status = formData.get('status');

	const cat = formData.get('category');
	if (cat === 'pool') {
		rsv.lanes = [formData.get('lane1')];
		if (formData.has('lane2')) {
			rsv.lanes[1] = formData.get('lane2');
		}
	} else if (cat === 'openwater') {
		rsv.buoy = formData.get('buoy');
	} else if (cat === 'classroom') {
		rsv.room = formData.get('room');
	}

	let record = await xata.db.Reservations.update(id, rsv);
	return {
		status: 'success',
		record
	};
}

export async function cancelReservation(formData) {
	let data = convertReservationTypes(Object.fromEntries(formData));

	await Settings.init();
	if (!beforeCancelCutoff(Settings, data.date, getStartTime(Settings, data), data.category)) {
		throw new ValidationError(
			'The cancellation window for this reservation has expired; this reservation can no longer be canceled'
		);
	}
	let save = data.buddies.filter((id) => !data.delBuddies.includes(id));
	let cancel = [data.id];
	let records = { modified: [], canceled: [] };
	if (data.buddies.length > 0) {
		let existing = await getUserOverlappingReservations(data, data.buddies);
		let modify = existing
			.filter((rsv) => save.includes(rsv.user.id))
			.map((rsv) => {
				let buddies = save.filter((id) => id != rsv.user.id);
				return { ...rsv, buddies };
			});
		if (modify.length > 0) {
			if (modify.reduce((b, rsv) => b || rsv.owner, false) == false) {
				// make sure one of the existing rsvs is the owner
				// doesn't matter which, as long as there is exactly
				// one owner
				modify[0].owner = true;
			}
			let modrecs = await xata.db.Reservations.update(modify);
			records.modified = modrecs;
		}

		cancel = cancel.concat(
			existing.filter((rsv) => !save.includes(rsv.user.id)).map((rsv) => rsv.id)
		);
	}

	let cancelrecs = await xata.db.Reservations.update(
		cancel.map((id) => {
			return { id, status: 'canceled' };
		})
	);
	records.canceled = cancelrecs;

	return {
		status: 'success',
		records
	};
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
