import { getSettings } from '$lib/server/server.js';
import { parseSettingsTbl } from '$lib/utils.js';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		let { buoys } = await getSettings();
		// let settings = parseSettingsTbl(settingsTbl);
		return json({ status: 'success', buoys });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
