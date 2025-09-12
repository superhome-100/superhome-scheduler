const GET = async () => {
  try {
    console.log("[health] GET");
  } catch {
  }
  return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
};

export { GET };
//# sourceMappingURL=_server.ts-2a4c37ae.js.map
