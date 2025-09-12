import { j as json } from './index-29bd59f7.js';

async function GET({ url }) {
  const id = url.searchParams.get("id") || "";
  return json({ status: "pending", id });
}

export { GET };
//# sourceMappingURL=_server.ts-1a30ca08.js.map
