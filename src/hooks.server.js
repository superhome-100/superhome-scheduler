/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const { pathname, search } = new URL(event.url);
	if (pathname.startsWith('/__/')) {
		const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
		redirectUrl.search = search; // copy URL parameters
		return new Response(null, {
			status: 302,
			headers: {
				...event.request.headers,
				location: redirectUrl.toString()
			}
		})
	}

	const response = await resolve(event)

	return response;
}