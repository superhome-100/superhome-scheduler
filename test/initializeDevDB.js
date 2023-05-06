import { XataClient } from '../src/lib/server/xata.codegen.server.js';

const XATA_API_KEY='xau_9xJINLTWEBX1d0EyWIi7YL9QinLT2TEv1';

const dev = new XataClient({ apiKey: XATA_API_KEY, branch: 'dev' });
const main = new XataClient({ apiKey: XATA_API_KEY, branch: 'main' });

async function getAll(xata) {
    let Settings = await xata.db.Settings.getAll();
    let Buoys = await xata.db.Buoys.getAll();
    let Users = await xata.db.Users.getAll();
    let Reservations = await xata.db.Reservations.getAll();
    Reservations = Reservations.map(rsv => { return {...rsv, user: rsv.user.id}});
    return { Settings, Buoys, Users, Reservations };
}

async function wipeDev() {
    let data = await getAll(dev);
    for (let tbl in data) {
        try {
            let ids = data[tbl].map(v => v.id);
            await dev.db[tbl].delete(ids);
        } catch (error) {
            console.log(error);
        }
    }
    let sessions = await dev.db.Sessions.getAll();
    await dev.db.Sessions.delete(sessions.map(v => v.id));
}

async function copyMainToDev() {
    let data = await getAll(main);
    for (let tbl in data) {
        await dev.db[tbl].create(data[tbl])
    }
}

async function initializeDev() {
    await wipeDev();
    await copyMainToDev();
}

initializeDev();
