import { json, type RequestEvent } from '@sveltejs/kit';

// Minimal status endpoint for Facebook data deletion flow
// URL example: /facebook/data-deletion-status?id=<confirmation_code>
export async function GET({ url }: RequestEvent) {
	const id = url.searchParams.get('id') || '';
	// If you later persist deletion jobs, you can look up the status by this id.
	// For now, just return a generic pending status.
	return json({ status: 'pending', id });
}
