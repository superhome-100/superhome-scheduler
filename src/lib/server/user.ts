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
		email: email || null,
		firebaseUID
	});
	await xata.db.UserPriceTemplates.create({ user: record.id, priceTemplate: 'regular' });
	return record;
}

export async function updateUserEmailAndFirebaseUID(
	userId: string,
	email: string,
	firebaseUID: string
) {
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
	const email = data.email.trim().toLowerCase();

	let record;
	const [providerMatch, emailMatch] = await Promise.all([
		isFacebook
			? xata.db.Users.filter({ facebookId: data.userId }).getFirst()
			: xata.db.Users.filter({ googleId: data.userId }).getFirst(),
		email ? xata.db.Users.filter({ email }).getFirst() : null
	]);

	if (!providerMatch && !emailMatch) {
		/* user does not exist yet */
		record = await addUser({
			firebaseUID: data.firebaseUID,
			providerId: data.providerId,
			providerUserId: data.userId,
			email,
			userName: data.userName
		});
	} else if (!emailMatch && providerMatch) {
		await updateUserEmailAndFirebaseUID(providerMatch.id, email, data.firebaseUID);
		record = providerMatch;
	} else {
		record = emailMatch || providerMatch;
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
