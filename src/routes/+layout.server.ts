import { getSettings } from '$lib/server/settings';

export async function load() {
	const settings = await getSettings();
	return {
		settings
	};
}
