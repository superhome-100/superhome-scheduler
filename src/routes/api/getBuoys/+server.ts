import { getBuoys } from '$lib/server/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    try {
        const buoys = await getBuoys();
        return json({ status: 'success', buoys });
    } catch (error) {
        return json({ 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
