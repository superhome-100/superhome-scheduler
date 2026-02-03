import { supabaseServiceRole } from '$lib/server/supabase';

export async function updateNickname(userId: string, nickname: string) {
	const { data } = await supabaseServiceRole
		.from('Users')
		.update({ nickname })
		.eq('id', userId)
		.select('*')
		.single()
		.throwOnError();
	return data;
}

export async function getUsersById(ids: string[]) {
	const { data } = await supabaseServiceRole
		.from('Users')
		.select('*')
		.in('id', ids)
		.throwOnError();
	return data;
}
