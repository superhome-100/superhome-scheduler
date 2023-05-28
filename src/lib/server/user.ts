import { getXataClient } from './xata';

const xata = getXataClient();

export async function getAllUsers() {
	const users = await xata.db.Users.getAll();
	return users;
}

export async function addUser(userId: string, userName: string) {
	const record = await xata.db.Users.create({
		facebookId: userId,
		name: userName,
		nickname: userName,
		status: 'disabled'
	});
	await xata.db.UserPriceTemplates.create({ user: record.id, priceTemplate: 'regular' });
	return record;
}

export async function updateNickname(userId: string, nickname: string) {
	const record = await xata.db.Users.update(userId, { nickname });
	return record;
}

export async function getUserById(id: string) {
	return await xata.db.Users.read(id);
}

export async function authenticateUser(userId: string, userName: string) {
	let record;
	let records = await xata.db.Users.filter({ facebookId: userId }).getMany({
		pagination: { size: 1 }
	});
	if (records.length == 0) {
		/* user does not exist yet */
		record = await addUser(userId, userName);
	} else {
		record = records[0];
	}
	return record;
}
