/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const { pathname, search } = new URL(event.url);
	if (pathname.startsWith('/__/')) {
    const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
    redirectUrl.search = search; // copy URL parameters

    const proxyResponse = await fetch(redirectUrl.toString(), event.request);
    const proxyHeaders = new Headers(proxyResponse.headers);
    const { status } = proxyResponse;

    return new Response(proxyResponse.body, {
      status,
      headers: proxyHeaders
    });
	}

	const response = await resolve(event)

	return response;
}