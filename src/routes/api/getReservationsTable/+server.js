import { getTableCsv } from '$lib/server/server.js';

export async function POST({ request }) {
    let { branch } = await request.json();
    let csv = await getTableCsv('Reservations', branch);
    return new Response(csv, {
        status: 200,
        headers: {
            'Content-type': 'text/csv; charset=UTF-8',
            'Content-Disposition': `attachment; filename=reservations-${branch}.csv`,
        },
    });
}

