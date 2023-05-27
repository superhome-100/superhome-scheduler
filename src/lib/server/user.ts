import { getXataClient } from './xata';

const xata = getXataClient();

export async function getAllUsers() {
	const users = await xata.db.Users.getAll();
	return users;
}
