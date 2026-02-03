import { assignRsvsToBuoys } from '$lib/autoAssign';
import { json, type RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { type OWReservation, ReservationCategory, ReservationStatus } from '$types';
import { type Tables } from '$lib/supabase.types';

export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user, 'admin');

		const { lock, date } = await request.json();
		const { data: rsvs } = await supabaseServiceRole
			.from('Reservations')
			.select('*')
			.eq('date', date)
			.eq('category', ReservationCategory.openwater)
			.in('status', [ReservationStatus.pending, ReservationStatus.confirmed])
			.overrideTypes<OWReservation[], { merge: false }>()
			.throwOnError()
			;
		const updates: { id: string, buoy: string }[] = [];
		if (lock) {
			const { data: buoys } = await supabaseServiceRole
				.from('Buoys')
				.select('*')
				.throwOnError();
			for (const owTime of ['AM', 'PM']) {
				const { assignments } = assignRsvsToBuoys(
					buoys,
					rsvs.filter((rsv) => rsv.owTime === owTime)
				);

				for (const buoy of buoys) {
					let toAsn = assignments[buoy.name];
					if (toAsn != undefined) {
						updates.push(...toAsn.map((rsv) => ({ id: rsv.id, buoy: buoy.name }))
						);
					}
				}
			}
		} else {
			rsvs.forEach((rsv) => updates.push({ id: rsv.id, buoy: 'auto' }));
		}
		const reservations: Tables<'Reservations'>[] = [];
		const errors: Error[] = [];
		for (const u of updates) {
			const { data, error } = await supabaseServiceRole
				.from('Reservations')
				.update(u)
				.eq("id", u.id!)
				.select('*')
				.single();
			if (error) errors.push(error);
			else reservations.push(data);
		}
		if (errors.length)
			throw Error(`Error during cancelling reservations: ${JSON.stringify(errors)}`);
		return json({ status: 'success', reservations });
	} catch (error) {
		console.error('error lockBuoyAssignments', error);
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		} else if (error instanceof Error) {
			return json({ status: 'error', error: error.message }, { status: 500 });
		}
		return json({ status: 'error', error });
	}
}
