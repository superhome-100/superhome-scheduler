import { checkSessionActive } from '$lib/server/server.js';

export function load({ route, cookies })  {
    checkSessionActive(route, cookies);
}
