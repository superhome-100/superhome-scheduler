import fetch from 'node-fetch';

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

    const proxyResponse = await fetch(redirectUrl.toString(), { headers });
    const proxyHeaders = Object.fromEntries(
      Object.entries(proxyResponse.headers).map(([key, value]) => [key, String(value)])
    );
    const { status } = proxyResponse;

    let responseData;
    if (pathname.endsWith('.js')) {
      // If it's a JS file, read the data as an ArrayBuffer and convert it to a Blob
      const arrayBuffer = await proxyResponse.arrayBuffer();
      responseData = new Blob([arrayBuffer], { type: proxyHeaders['content-type'] });
    } else {
      // Otherwise, just use the text data
      responseData = await proxyResponse.text();
    }

    return new Response(responseData, {
      status,
      headers: proxyHeaders
    });
  }

  const response = await resolve(event);

  return response;
}