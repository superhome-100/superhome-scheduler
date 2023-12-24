import { getXataClient } from './xata-old';
import type { Cookies } from '@sveltejs/kit';

const xata = getXataClient();

export async function getAllUsers() {
	const users = await xata.db.Users.getAll();
	return users;
}

export async function addUser({
	firebaseUID,
	providerId,
	providerUserId,
	email,
	userName
}: {
	firebaseUID: string;
	providerId: string;
	providerUserId: string;
	email: string;
	userName: string;
}) {
	const record = await xata.db.Users.create({
		[providerId === 'facebook.com' ? 'facebookId' : 'googleId']: providerUserId,
		name: userName,
		nickname: userName,
		status: 'disabled',
		email,
		firebaseUID,
	});
	await xata.db.UserPriceTemplates.create({ user: record.id, priceTemplate: 'regular' });
	return record;
}

export async function updateUserEmailAndFirebaseUID(userId: string, email: string, firebaseUID: string) {
	const record = await xata.db.Users.update(userId, { email, firebaseUID });
	return record;
}

export async function updateNickname(userId: string, nickname: string) {
	const record = await xata.db.Users.update(userId, { nickname });
	return record;
}

export async function getUsersById(ids: string[]) {
	return await xata.db.Users.read(ids);
}

interface AuthenticateUserArgs {
	firebaseUID: string;
	userId: string;
	userName: string;
	email: string;
	providerId: string;
}
export async function authenticateUser(data: AuthenticateUserArgs) {
	const isFacebook = data.providerId === 'facebook.com';

	let record;
	const [providerMatch, emailMatch ] = await Promise.all([
		isFacebook ?
			xata.db.Users.filter({ facebookId: data.userId }).getMany({ pagination: { size: 1 } }):
			xata.db.Users.filter({ googleId: data.userId }).getMany({ pagination: { size: 1 } }),
		xata.db.Users.filter({ email: data.email }).getMany({ pagination: { size: 1 } })
	]);

	if (!providerMatch.length && !emailMatch.length) {
		/* user does not exist yet */
		record = await addUser({
			firebaseUID: data.firebaseUID,
			providerId: data.providerId,
			providerUserId: data.userId,
			email: data.email,
			userName: data.userName
		});
	} else if (!emailMatch.length && providerMatch.length) {
		await updateUserEmailAndFirebaseUID(providerMatch[0].id, data.email, data.firebaseUID);
		record = providerMatch[0];
	}else {
		record = emailMatch[0] ||  providerMatch[0];
	}
	return record;
}

export async function getUserByCookies(cookies: Cookies) {
	const sessionID = cookies.get('sessionid');
	if (!sessionID) return undefined;

	let record = await xata.db.Sessions.read(sessionID);
	if (record == undefined) {
		return undefined;
	}
	return await xata.db.Users.read(record.user!);
}
