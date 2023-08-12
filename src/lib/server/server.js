import { getXataClient } from '$lib/server/xata-old';
import { addMissingFields, convertReservationTypes } from '$lib/utils.js';
import { buddysRsv, checkSpaceAvailable } from '$lib/validationUtils.js';
import { redirect } from '@sveltejs/kit';
import { startTimes, endTimes } from '$lib/reservationTimes.js';
import { timeStrToMin } from '$lib/datetimeUtils';
import { Settings } from '$lib/server/settings';
import ObjectsToCsv from 'objects-to-csv';
import JSZip from 'jszip';

import { getUserById } from './user';

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

function getTimeSlots(settings, date, category, start, end) {
	let sTs = startTimes(settings, date, category);
	let eTs = endTimes(settings, date, category);
	let times = [...sTs, eTs[eTs.length - 1]];

	let sIdx = times.indexOf(start);
	let eIdx = times.indexOf(end);
	if (sIdx == -1 && eIdx == -1) {
		return null;
	}

	if (sIdx == -1) {
		sIdx = 0;
	}
	if (eIdx == -1) {
		eIdx = times.length - 1;
	}

	let beforeStart = times.slice(0, sIdx);
	let startVals = times.slice(sIdx, eIdx);

	let endVals = times.slice(sIdx + 1, eIdx + 1);
	let afterEnd = times.slice(eIdx + 1);

	return { startVals, endVals, beforeStart, afterEnd };
}

function timeOverlap(startA, endA, startB, endB) {
	startA = timeStrToMin(startA);
	startB = timeStrToMin(startB);
	endA = timeStrToMin(endA);
	endB = timeStrToMin(endB);
	return (
		(startA >= startB && startA < endB) ||
		(endA <= endB && endA > startB) ||
		(startA < startB && endA > endB)
	);
}

function getTimeOverlapFilters(settings, rsv) {
	let owAmStart = settings.get('openwaterAmStartTime', rsv.date);
	let owAmEnd = settings.get('openwaterAmEndTime', rsv.date);
	let owPmStart = settings.get('openwaterPmStartTime', rsv.date);
	let owPmEnd = settings.get('openwaterPmEndTime', rsv.date);
	let start, end;
	let owTimes = [];
	if (['pool', 'classroom'].includes(rsv.category)) {
		start = rsv.startTime;
		end = rsv.endTime;
		if (timeOverlap(start, end, owAmStart, owAmEnd)) {
			owTimes.push('AM');
		}
		if (timeOverlap(start, end, owPmStart, owPmEnd)) {
			owTimes.push('PM');
		}
	} else if (rsv.category === 'openwater') {
		owTimes.push(rsv.owTime);
		if (rsv.owTime === 'AM') {
			start = owAmStart;
			end = owAmEnd;
		} else if (rsv.owTime === 'PM') {
			start = owPmStart;
			end = owPmEnd;
		}
	}

	let filters = [];

	if (owTimes.length > 0) {
		filters.push({
			category: 'openwater',
			owTime: { $any: owTimes }
		});
	}

	let slots = getTimeSlots(Settings, rsv.date, 'pool', start, end);
	if (slots != null) {
		let timeFilt = [];
		if (slots.startVals.length > 0) {
			timeFilt.push({ startTime: { $any: slots.startVals } });
		}
		if (slots.endVals.length > 0) {
			timeFilt.push({ endTime: { $any: slots.endVals } });
		}
		if (slots.beforeStart.length > 0 && slots.afterEnd.length > 0) {
			timeFilt.push({
				$all: [{ startTime: { $any: slots.beforeStart } }, { endTime: { $any: slots.afterEnd } }]
			});
		}
		filters.push({
			category: { $any: ['pool', 'classroom'] },
			$any: timeFilt
		});
	}
	return filters;
}

async function getOverlappingReservations(sub, buddies) {
	await Settings.init();
	let filters = {
		date: sub.date,
		user: { $any: buddies },
		$any: getTimeOverlapFilters(Settings, sub),
		status: { $any: ['pending', 'confirmed'] }
	};
	let existing = await xata.db.Reservations.filter(filters).getAll();
	return existing;
}

async function getExistingRsvs(entries) {
	let ids = entries
		.filter((o) => o.id)
		.map((o) => {
			return { id: o.id };
		});
	let filters = {
		date: entries[0].date,
		category: entries[0].category,
		status: { $any: ['pending', 'confirmed'] }
	};
	if (ids.length > 0) {
		filters.$not = { $any: ids };
	}

	let existing = await xata.db.Reservations.filter(filters).getAll();
	// remove const
	return existing.map((rsv) => {
		return { ...rsv };
	});
}

async function querySpaceAvailable(entries, remove = []) {
	let existing = await getExistingRsvs([...entries, ...remove]);
	let buoys;
	let sub = entries[0];
	if (sub.category === 'openwater') {
		buoys = await xata.db.Buoys.getAll();
	}
	await Settings.init();
	let result = checkSpaceAvailable(Settings, buoys, sub, existing);
	if (result.status === 'error') {
		return {
			status: 'error',
			code: 'NO_SPACE_AVAILABLE',
			message: result.message
		};
	} else {
		return {
			status: 'success'
		};
	}
}

export async function submitReservation(formData) {
	let sub = convertReservationTypes(Object.fromEntries(formData));

	const user = await getUserById(sub.user);
	if (user && user.status === 'disabled') {
		return {
			status: 'error',
			code: 'USER_DISABLED'
		};
	}

	let checkExisting = [sub.user, ...sub.buddies];
	let existing = await getOverlappingReservations(sub, checkExisting);
	if (existing.length > 0) {
		return {
			status: 'error',
			code: 'RSV_EXISTS'
		};
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
	let result = await querySpaceAvailable(entries);
	if (result.status === 'error') {
		return result;
	}

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

	// first check that the submitter and associated buddies do not have existing
	// reservations that will overlap with the updated reservation
	let checkExisting = [sub.user, ...sub.buddies];
	let existing = await getOverlappingReservations(sub, checkExisting);
	if (existing.length > 0) {
		for (let rsv of existing) {
			if (rsv.id !== orig.id && !buddysRsv(rsv, orig)) {
				return {
					status: 'error',
					code: 'RSV_EXISTS'
				};
			}
		}
	}

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
			existingBuddies = await getOverlappingReservations(orig, oldBuddies);
		}

		for (let bId of buddySet) {
			if (buddies.includes(bId) && oldBuddies.includes(bId)) {
				// modify
				let rsvId = existingBuddies.filter((rsv) => rsv.user.id === bId)[0].id;
				let bg = [user, ...buddies.filter((bIdp) => bIdp != bId)];
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
				let bg = [user, ...buddies.filter((bIdp) => bIdp != bId)];
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

	let result = await querySpaceAvailable([...modify, ...create], cancel);
	if (result.status === 'error') {
		return result;
	}

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

	let save = data.buddies.filter((id) => !data.delBuddies.includes(id));
	let cancel = [data.id];
	let records = { modified: [], canceled: [] };
	if (data.buddies.length > 0) {
		let existing = await getOverlappingReservations(data, data.buddies);
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

	return records;
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
