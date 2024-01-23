export async function handle({ request, resolve }) {
	const { pathname, search } = new URL(request.url);

	if (pathname.startsWith('/__/')) {
		const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${url.pathname}`);
		redirectUrl.search = search; // copy URL parameters

		return {
			status: 302,
			headers: {
				...request.headers,
				location: redirectUrl.toString()
			}
		};
	}

	const response = await resolve(request);

	return {
		...response,
		headers: {
			...response.headers
		}
	};
}
