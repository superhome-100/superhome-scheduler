import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = new URL(event.url);
	if (pathname.startsWith('/__/')) {
		const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
		redirectUrl.search = search; // copy URL parameters

		// Filter out problematic headers and forward method/body when appropriate
		const filteredHeaders = new Headers(event.request.headers);
		filteredHeaders.delete('host');
		filteredHeaders.delete('content-length');
		filteredHeaders.delete('transfer-encoding');

		const method = event.request.method;
		const init: RequestInit = { method, headers: filteredHeaders };
		if (!['GET', 'HEAD'].includes(method)) {
			// Clone body for forwarding; avoid attaching a body to GET/HEAD
			const buf = await event.request.arrayBuffer();
			init.body = buf;
		}

		const proxyResponse = await fetch(redirectUrl.toString(), init);

		// Stream the response through with original headers and status
		return new Response(proxyResponse.body, {
			status: proxyResponse.status,
			headers: proxyResponse.headers
		});
	}

	return resolve(event);
};
