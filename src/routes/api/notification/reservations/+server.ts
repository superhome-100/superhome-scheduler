import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';
import dayjs from 'dayjs';

interface RequestBody {
	title: string;
	body: string;
	// filters
	happeningInTheNextHours: string;
	category?: string;
	owTime?: string;
}

export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const req = (await request.json()) as RequestBody;

		const now = dayjs();

		// happeningInTheNextHours

		const { data } = await supabaseServiceRole
			.from("Reservations")
			.select("*")
			.throwOnError();
		// rsvs = data.forEach(r=>r._dt = '');(r=>r.)

		// const result = await pushNotificationService.send(data.id, 'title', 'notification test');

		return json({ status: 'success' });
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error}` });
	}
}
