import * as Sentry from '@sentry/sveltekit';



export const console_error = (message: string, e: Error | unknown, ...params: unknown[]) => {
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(message, e, stack, ...params);
    Sentry.captureException(e, { data: { message, params } });
}

export const console_info = (message: string, ...params: unknown[]) => {
    console.info(message, ...params);
    Sentry.captureMessage(message, { extra: { params } });
}