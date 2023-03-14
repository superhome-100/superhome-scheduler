import { checkSessionActive } from '$lib/server/server.js';

export function load({ route, cookies, params }) {
    checkSessionActive(route, cookies);
    return params;
}

