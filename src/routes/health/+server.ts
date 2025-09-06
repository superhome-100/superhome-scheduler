import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	try {
		console.log('[health] GET');
	} catch {}
	return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
};
