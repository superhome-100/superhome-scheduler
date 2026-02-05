import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { PRIVATE_SUPABASE_SERVICE_KEY } from '$env/static/private';

import { createClient, type Session, type SupabaseClient as SupabaseClientExt } from '@supabase/supabase-js';
import type { Database, Enums } from '../supabase.types';
import type { User } from '$types';

export class AuthError extends Error {
	constructor(public code: number, ...params) {
		super(...params);
	}
}

export type SupabaseClient = SupabaseClientExt<Database>;

export const supabaseServiceRole = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	PRIVATE_SUPABASE_SERVICE_KEY,
);

const isPermitted = (
	requiredPrivilege: Enums<'user_privilege'>,
	actualPrivilege: Enums<'user_privilege'>
): boolean => {
	switch (requiredPrivilege) {
		case 'normal':
			return actualPrivilege === 'normal' || actualPrivilege === 'admin';
		case 'admin':
			return actualPrivilege === 'admin';
		default:
			throw Error(`unexpected case ${requiredPrivilege}`);
	}
};

export function checkAuthorisation(
	user: User | null,
	requiredPrivilege: Enums<'user_privilege'> = 'normal'
): asserts user is User {
	if (user === null) throw new AuthError(401, 'Auth Error: not logged in');
	if (user.status !== 'active') throw new AuthError(403, `Auth Error: user(${user.id}) is not active`);
	if (!isPermitted(requiredPrivilege, user.privileges))
		throw new AuthError(403,
			`Auth Error: user(${user.id}) is ${user.privileges} but required ${requiredPrivilege}`
		);
}

export function sessionToSessionId(session: Session): string {
	const base64 = session.access_token.split('.')[1]
	const jsStr = Buffer.from(base64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
	return JSON.parse(jsStr).session_id;
}