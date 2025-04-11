import dotenv from 'dotenv';
import dayjs from 'dayjs';
import { XataClient } from '../src/lib/server/xata.codegen'; // has to stay .js even though its .ts ... weird

dotenv.config({
	path: '.env'
});

const dev = new XataClient({ apiKey: process.env.XATA_API_KEY, branch: 'dev' });
const main = new XataClient({ apiKey: process.env.XATA_API_KEY, branch: 'main' });

async function getAll(xata: XataClient, dateStr: string): Promise<Record<string, any[]>> {
	let Settings = await xata.db.Settings.getAll();
	let Buoys = await xata.db.Buoys.getAll();
	let Users = await xata.db.Users.getAll();

	const now = dayjs(dateStr);
	const nowMinus7 = now.subtract(7, 'day');
	// list of dates from 7 days ago to 7 days from now in string format
	const dates = Array.from({ length: 14 }).map((_, i) =>
		nowMinus7.add(i, 'day').format('YYYY-MM-DD')
	);

	let Reservations = await xata.db.Reservations.filter({
		// PS: date is string not Date
		date: {
			$any: dates
		}
	})
		.select(['*', 'user'])
		.getAll();
	let Boats = await xata.db.Boats.getAll();
	let UserPriceTemplates = await xata.db.UserPriceTemplates.getAll();
	return { Settings, Buoys, Boats, Users, Reservations, UserPriceTemplates };
}

async function wipeDev() {
	let data = await getAll(dev, new Date().toISOString());
	for (let tbl in data) {
		console.log(tbl);
		try {
			let ids = data[tbl].map((v) => v.id);
			// @ts-ignore ignore tbl typing
			await dev.db[tbl].delete(ids);
		} catch (error) {
			console.log(error);
		}
	}
	let sessions = await dev.db.Sessions.getAll();
	await dev.db.Sessions.delete(sessions.map((v) => v.id));
}

async function copyMainToDev() {
	const dateStr = dayjs().locale('en-US').format('YYYY-MM-DD');
	let data = await getAll(main, dateStr);
	for (let tbl in data) {
		// @ts-ignore ignore tbl typing
		await dev.db[tbl].create(data[tbl]);
	}
}

async function initializeDev() {
	await wipeDev();
	await copyMainToDev();
}

initializeDev();
