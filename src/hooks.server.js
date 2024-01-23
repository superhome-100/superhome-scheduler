import axios from 'axios';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const { pathname, search } = new URL(event.url);
	if (pathname.startsWith('/__/')) {
    const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
    redirectUrl.search = search; // copy URL parameters

    const proxyResponse = await axios.get(redirectUrl.toString(), { headers: event.request.headers });
    const proxyHeaders = proxyResponse.headers;
    const { status } = proxyResponse;

    return new Response(proxyResponse.data, {
      status,
      headers: proxyHeaders
    });
	}

	const response = await resolve(event)

	return response;
}