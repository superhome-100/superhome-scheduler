/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const { pathname, search } = new URL(event.url);
	if (pathname.startsWith('/__/')) {
		const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
		redirectUrl.search = search; // copy URL parameters
		const response = await fetch(redirectUrl.toString(), event.request);
		console.log(response)
		return response;
	}

	const response = await resolve(event);
	response.headers.set('x-custom-header', 'potato');

	return response;
}