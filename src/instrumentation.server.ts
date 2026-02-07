import { PUBLIC_STAGE } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';


Sentry.init({
	dsn: 'https://f2da7b160a72d4083e99922a3ae707fe@o4510844761931776.ingest.de.sentry.io/4510844770975824',

	// Enable logs to be sent to Sentry
	enableLogs: true, // PUBLIC_STAGE !== 'dev' TODO:mate

	integrations: [
		Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
	],

	environment: PUBLIC_STAGE ?? 'production',
	release: `superhome-scheduler.server@${__APP_VERSION__}`,

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});
