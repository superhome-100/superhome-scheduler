import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata-old';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { getXataUserDocWithFirebaseToken } from '$lib/server/firestore';

const xata = getXataClient();

interface RequestData {
    date: string;
    category: string;
}

interface XataUser {
    id: string;
    [key: string]: any;
}

export async function POST({ request }: RequestEvent) {
    try {
        const xataUser: XataUser | null = await getXataUserDocWithFirebaseToken(request.headers);
        if (!xataUser || !xataUser.id) {
            return json({ status: 'error', error: 'User not found' });
        }

        const { date, category } = await request.json() as RequestData;
        const rawRsvs = await xata.db.Reservations.filter({
            date,
            category,
            status: {
                $any: ['confirmed', 'pending']
            }
        }).getAll();
        
        const reservations = await convertFromXataToAppType(rawRsvs);
        return json({ status: 'success', reservations });
    } catch (error) {
        console.error('Error in getReservationsByDate', error);
        return json({ 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
