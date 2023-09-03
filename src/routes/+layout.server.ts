import { getSettings } from '$lib/server/settings';
import type { Setting } from '$types';

export async function load() {
	const settings = (await getSettings()) as {
		[key: string]: Setting;
	};
	return {
		settings
	};
}
