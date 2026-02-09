import type { ScheduledController, ExecutionContext, Fetcher } from "@cloudflare/workers-types";

interface Env {
    PUBLIC_VAPID_SUBJECT: string,
    PRIVATE_CRON_SECRET: string
    SELF: Fetcher;
}

export default {
    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<void> {
        ctx.waitUntil(env.SELF.fetch("https://internal/api/updatePrices", {
            headers: { "X-Cron-Secret": env.PRIVATE_CRON_SECRET }
        }));
    },
};