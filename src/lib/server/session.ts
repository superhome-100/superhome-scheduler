import { getXataClient } from '$lib/server/xata-old';
import type { UsersRecord } from '$lib/server/xata.codegen';

const xata = getXataClient();

// this is actually related to the user's authantication session data
// TODO: this should be simply managed by cookie data

export async function getSession(id: string) {
	let records = await xata.db.Sessions.select(['*', 'user']).filter({ id: id }).getMany();
	return records[0];
}

export async function deleteSession(id: string) {
	return await xata.db.Sessions.delete(id);
}

export async function createSession(user: UsersRecord) {
	return await xata.db.Sessions.create({
		user: user.id
	});
}