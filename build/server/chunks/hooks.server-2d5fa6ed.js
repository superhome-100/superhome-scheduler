const handle = async ({ event, resolve }) => {
  const { pathname, search } = new URL(event.url);
  if (pathname.startsWith("/__/")) {
    const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
    redirectUrl.search = search;
    const filteredHeaders = new Headers(event.request.headers);
    filteredHeaders.delete("host");
    filteredHeaders.delete("content-length");
    filteredHeaders.delete("transfer-encoding");
    const method = event.request.method;
    const init = { method, headers: filteredHeaders };
    if (!["GET", "HEAD"].includes(method)) {
      const buf = await event.request.arrayBuffer();
      init.body = buf;
    }
    const proxyResponse = await fetch(redirectUrl.toString(), init);
    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers: proxyResponse.headers
    });
  }
  return resolve(event);
};

export { handle };
//# sourceMappingURL=hooks.server-2d5fa6ed.js.map
