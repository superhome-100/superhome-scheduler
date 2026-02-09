import type { ScheduledController, ExecutionContext, Fetcher } from "@cloudflare/workers-types";
import Server from '../.svelte-kit/cloudflare/_worker.js';

interface Env {
    PUBLIC_VAPID_SUBJECT: string,
    PRIVATE_CRON_SECRET: string
    SELF: Fetcher;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        return Server.fetch(request, env, ctx);
    },
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