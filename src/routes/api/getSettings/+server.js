import { getSettings } from '$lib/server/server.js';
import { json } from '@sveltejs/kit';

export async function GET() {
    let { settingsTbl, buoys } = await getSettings();
    let settings = {}

    for (let s of settingsTbl) {
        let name = s.name;
        let v = s.value;
        if (['refreshIntervalSeconds'].includes(name)) {
            v = parseInt(v);
        } else if (['poolLanes', 'classrooms'].includes(name)) {
            v = v.split(';');
        }
        if (name === 'refreshIntervalSeconds') {
            name = 'refreshInterval'
            v = v*1000;
        }
        settings[name] = v;
    }

    return json({ settings, buoys });
}
