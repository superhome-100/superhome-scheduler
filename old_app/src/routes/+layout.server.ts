import { getSettings } from '$lib/server/settings';

export async function load() {
    try {
        console.log('[layout.server] load called');
    } catch {}
    const settings = await getSettings();
    return {
        settings
    };
}
