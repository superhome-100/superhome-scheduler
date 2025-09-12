import { getOWReservationAdminComments } from '$lib/server/ow';
import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET({ params }: RequestEvent) {
	// @ts-ignore - todo fix this type
	const adminComments = await getOWReservationAdminComments(params['date']);
	return json(adminComments);
}
