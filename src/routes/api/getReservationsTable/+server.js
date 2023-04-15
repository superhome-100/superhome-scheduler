import { getTableCsv } from '$lib/server/server.js';

export async function GET() {
    let csv = await getTableCsv('Reservations');

    return new Response(csv, {
        status: 200,
        headers: {
            'Content-type': 'text/csv',
            'Content-Disposition': 'attachment; filename=reservations.csv',
        },
    });
}

