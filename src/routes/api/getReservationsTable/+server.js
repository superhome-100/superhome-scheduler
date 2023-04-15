import fs from 'fs';
import { writeTableToCsv } from '$lib/server/server.js';

export async function GET() {
    let csvFn = await writeTableToCsv('Reservations');
    let csv = fs.readFileSync(csvFn);

    return new Response(csv, {
        status: 200,
        headers: {
            'Content-type': 'text/csv',
            'Content-Disposition': 'attachment; filename=reservations.csv',
        },
    });
}

