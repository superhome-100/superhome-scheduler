// cron/job.js

// https://github.com/sveltejs/kit/issues/4841#issuecomment-3290611044
/**
 * @param {import("@cloudflare/workers-types").ScheduledEvent} event
 * @param {Env} env
 * @param {import('@cloudflare/workers-types').EventContext<Env, "", {}>} ctx
 */
worker_default.scheduled = async (event, env, ctx) => {
	// You can use example.com or any other origin as long as it's a fully-qualified URL.
	// Replace /_cron with any path of your choosing, preferably one with some secret key so outsiders cannot trigger your cron jobs arbitrarily.
	const req = new Request('https://internal/api/updatePrices', {
		method: 'GET',
		headers: {
			'X-Cron-Secret': env.PRIVATE_CRON_SECRET
		}
	});
	await worker_default.fetch(req, env, ctx);
};
