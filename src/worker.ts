import type { ScheduledController, ExecutionContext } from "@cloudflare/workers-types";

interface Env {
    PUBLIC_VAPID_SUBJECT: string,
    PRIVATE_CRON_SECRET: string
}

export default {
    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<void> {
        const url = new URL("/api/updatePrices", env.PUBLIC_VAPID_SUBJECT);

        // Use a secret header to ensure only your cron can call this
        const request = new Request(url, {
            headers: { "X-Cron-Secret": env.PRIVATE_CRON_SECRET }
        });

        ctx.waitUntil(fetch(request));
    },
};