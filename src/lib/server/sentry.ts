import * as Sentry from '@sentry/sveltekit';



export const console_error = (message: string, e: Error | unknown, ...params: any[]) => {
    console.error(message, e, ...params);
    Sentry.captureException(e, { data: { message, params } });
}