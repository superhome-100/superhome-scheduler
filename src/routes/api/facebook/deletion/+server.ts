import { json, type RequestEvent } from '@sveltejs/kit';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// Helper to convert base64url -> Buffer
function base64UrlDecode(input: string): Buffer {
	return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// Verify Facebook signed_request using app secret
function parseSignedRequest(signedRequest: string, appSecret: string): Record<string, any> | null {
	const [encodedSig, payload] = signedRequest.split('.');
	if (!encodedSig || !payload) return null;

	const sig = base64UrlDecode(encodedSig);
	const dataJson = base64UrlDecode(payload).toString('utf8');
	const data = JSON.parse(dataJson);

	// Expect HMAC-SHA256
	if (!data.algorithm || String(data.algorithm).toUpperCase() !== 'HMAC-SHA256') {
		return null;
	}

	const expectedSig = crypto.createHmac('sha256', appSecret).update(payload).digest();
	if (!crypto.timingSafeEqual(sig, expectedSig)) {
		return null;
	}
	return data;
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const appSecret = env.FACEBOOK_APP_SECRET;
		if (!appSecret) {
			console.error('FACEBOOK_APP_SECRET is not set');
			return json({ error: 'server_misconfigured' }, { status: 500 });
		}

		let signed_request: string | undefined;
		const contentType = request.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			const body = await request.json();
			signed_request = body?.signed_request;
		} else if (
			contentType.includes('application/x-www-form-urlencoded') ||
			contentType.includes('multipart/form-data')
		) {
			const form = await request.formData();
			signed_request = String(form.get('signed_request') || '');
		} else {
			// Try both just in case
			try {
				const body = await request.json();
				signed_request = body?.signed_request;
			} catch {
				const form = await request.formData();
				signed_request = String(form.get('signed_request') || '');
			}
		}

		if (!signed_request) {
			return json({ error: 'missing_signed_request' }, { status: 400 });
		}

		const data = parseSignedRequest(signed_request, appSecret);
		if (!data) {
			return json({ error: 'invalid_signed_request' }, { status: 400 });
		}

		const user_id = data.user_id as string | undefined;
		// TODO: enqueue/trigger deletion of user data linked to user_id in your system
		console.log('Facebook data deletion requested for user_id:', user_id);

		// Create a confirmation code for the deletion request
		const confirmation_code = crypto.randomBytes(8).toString('hex');

		// Build a status URL users can visit to see the state of deletion
		// e.g. https://your.site/facebook/data-deletion-status?id=<code>
		const statusUrl = new URL('/facebook/data-deletion-status', url);
		statusUrl.searchParams.set('id', confirmation_code);

		return json({ url: statusUrl.toString(), confirmation_code });
	} catch (err) {
		console.error('Error handling FB data deletion callback:', err);
		return json({ error: 'internal_error' }, { status: 500 });
	}
}
