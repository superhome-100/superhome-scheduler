// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

//const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

self.addEventListener('push', (event) => {
	const data = event.data ? event.data.json() : { title: 'Notification', body: 'New message!' };

	const options = {
		body: data.body,
		icon: '/favicon.png', // Path to your static icon
		// badge: '/badge.png',
		data: { url: data.url }
	};

	event.waitUntil(
		self.registration.showNotification(data.title, options)
	);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		clients.openWindow(event.notification.data.url || '/')
	);
});