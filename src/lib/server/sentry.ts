import * as Sentry from '@sentry/sveltekit';



export const console_error = (message: string, e: Error | unknown, ...params: unknown[]) => {
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(message, e, stack, ...params);
    Sentry.captureException(e, { data: { message, params } });
}