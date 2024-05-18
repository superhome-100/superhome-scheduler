import { getXataClient } from '$lib/server/xata-old';
import { json, RequestEvent } from '@sveltejs/kit';

const xata = getXataClient();

export async function GET({ params }: RequestEvent) {
	try {
		const date = params['date'];
		const boatAssignments = await xata.db.Boats.filter({
			id: date
		}).getFirst();

		const assignments = boatAssignments?.assignments ? JSON.parse(boatAssignments.assignments) : {};

		return json({ status: 'success', assignments });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
