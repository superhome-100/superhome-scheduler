import axios from 'axios';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const { pathname, search } = new URL(event.url);
	if (pathname.startsWith('/__/')) {
    const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
    redirectUrl.search = search; // copy URL parameters
    // Filter out problematic headers
    const headers = Object.fromEntries(
      Object.entries(event.request.headers).filter(([key]) => 
        !['host', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())
      )
    );

		const isJsFile = pathname.endsWith('.js');
    const axiosOptions = isJsFile ? { headers, responseType: 'arraybuffer' } : { headers };

    const proxyResponse = await axios.get(redirectUrl.toString(), {
			...axiosOptions,
		});
    const proxyHeaders = Object.fromEntries(
      Object.entries(proxyResponse.headers).map(([key, value]) => [key, String(value)])
    );
    const { status } = proxyResponse;

    return new Response(proxyResponse.data, {
      status,
      headers: proxyHeaders
    });
	}

	const response = await resolve(event)

	return response;
}