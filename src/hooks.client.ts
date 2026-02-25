import { PUBLIC_STAGE } from '$env/static/public';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://f2da7b160a72d4083e99922a3ae707fe@o4510844761931776.ingest.de.sentry.io/4510844770975824',

	// Enable logs to be sent to Sentry
	enableLogs: PUBLIC_STAGE !== 'local',

	integrations: [
		Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
	],

	// Enable sending user PII (Personally Identifiable Information)
	// https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
	sendDefaultPii: true,
	environment: PUBLIC_STAGE ?? 'production',
	release: `superhome-scheduler.client@${__APP_VERSION__}`,
	ignoreErrors: [
		/.*use the `fetch` that is passed to your `load` function.*/,
		/.*> was created with unknown prop.*/,
	]
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
