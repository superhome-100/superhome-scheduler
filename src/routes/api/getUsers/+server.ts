import { json } from '@sveltejs/kit';
import { getAllUsers } from '../../../lib/server/user';

// TODO: break this apart into separate functions
export async function GET() {
	try {
		const [users] = await Promise.all([getAllUsers()]);
		const usersById = users.reduce((obj, user) => {
			obj[user.id] = user;
			return obj;
		}, {} as { [uid: string]: any });

		return json({
			status: 'success',
			usersById
		});
	} catch (error) {
		console.error(error);
		return json({ status: 'error', error });
	}
}
