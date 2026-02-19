import Papa from 'papaparse';
import JSZip from 'jszip';
import { supabaseServiceRole } from '$lib/server/supabase';
import type { Notification } from '$types';
import { fetchAllRows } from '$lib/supabase';
import type { Database } from '$lib/supabase.types';

export async function getBackUpZip() {
	const tables: (keyof Database["public"]["Tables"])[] = [
		"Users",
		"Reservations",
		"Settings",
		"Buoys",
		"Boats",
		"PriceTemplates",
		"UserPriceTemplates",
		"BuoyGroupings",
		"Notifications",
		"NotificationReceipts",
	]
	const zip = new JSZip();

	for (const t of tables) {
		const records = await fetchAllRows(supabaseServiceRole, t) as object[];
		const csv = Papa.unparse(records);
		const csvStr = await csv.toString();
		zip.file(t + '.csv', csvStr);
	}

	return zip;
}

export async function getBuoys() {
	const { data } = await supabaseServiceRole
		.from('Buoys')
		.select('*')
		.throwOnError();
	return data;
}

export async function insertNotificationReceipt(notificationId: string, userId: string) {
	await supabaseServiceRole
		.from('NotificationReceipts')
		.insert({
			user: userId,
			notification: notificationId
		})
		.throwOnError();
}
