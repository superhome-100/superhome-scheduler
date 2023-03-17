import { getSettings } from '$lib/server/server.js';
import { json } from '@sveltejs/kit';

export async function GET() {
    let response = await getSettings();
    let settings = {}
    for (let s of response) {
        settings[s.name] = s.value;
    }
    return json({ settings });
}
