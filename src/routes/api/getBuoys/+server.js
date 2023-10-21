import { getBuoys } from '$lib/server/server';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		let buoys = await getBuoys();
		return json({ status: 'success', buoys });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
