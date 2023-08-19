import dayjs from 'dayjs';
import { XataClient } from '../src/lib/server/xata.codegen.js';

const XATA_API_KEY = 'xau_9xJINLTWEBX1d0EyWIi7YL9QinLT2TEv1';

const dev = new XataClient({ apiKey: XATA_API_KEY, branch: 'dev' });
const main = new XataClient({ apiKey: XATA_API_KEY, branch: 'main' });

async function getAll(xata, dateStr) {
	let Settings = await xata.db.Settings.getAll();
	let Buoys = await xata.db.Buoys.getAll();
	let Users = await xata.db.Users.getAll();
	let Reservations = await xata.db.Reservations
        .filter({ date: { $ge: dateStr }})
        .select(['*', 'user'])
        .getAll();
	let Boats = await xata.db.Boats.getAll();
	let UserPriceTemplates = await xata.db.UserPriceTemplates.getAll();
	return { Settings, Buoys, Boats, Users, Reservations, UserPriceTemplates };
}

async function wipeDev() {
	let data = await getAll(dev, '1970-01-01');
	for (let tbl in data) {
		try {
			let ids = data[tbl].map((v) => v.id);
			await dev.db[tbl].delete(ids);
		} catch (error) {
			console.log(error);
		}
	}
	let sessions = await dev.db.Sessions.getAll();
	await dev.db.Sessions.delete(sessions.map((v) => v.id));
}

async function copyMainToDev() {
    let date = new Date();
    date.setDate(date.getDate() - 7);
    let dateStr = dayjs(date).locale('en-US').format('YYYY-MM-DD');
	let data = await getAll(main, dateStr);
	for (let tbl in data) {
		await dev.db[tbl].create(data[tbl]);
	}
}

async function initializeDev() {
	await wipeDev();
	await copyMainToDev();
}

initializeDev();
