import { XataClient } from '../src/lib/server/xata.codegen.server.js';

const XATA_API_KEY='xau_9xJINLTWEBX1d0EyWIi7YL9QinLT2TEv1';

const dev = new XataClient({ apiKey: XATA_API_KEY, branch: 'dev' });
const main = new XataClient({ apiKey: XATA_API_KEY });

let settings = await main.db.Settings.getAll();
let buoys = await main.db.Buoys.getAll();
let users = await main.db.Users.getAll();
let rsvs = await main.db.Reservations.getAll();
let updated = rsvs.map(rsv => { return {...rsv, user: rsv.user.id}});

await dev.db.Settings.create(settings);
await dev.db.Buoys.create(buoys);
await dev.db.Users.create(users);
await dev.db.Reservations.create(updated);
