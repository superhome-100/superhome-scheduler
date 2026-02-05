// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

//const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

self.addEventListener('push', (event: any) => {
	if (!(self.Notification && self.Notification.permission === 'granted')) {
		return;
	}

	// Parse the payload sent from your server
	const data = event.data?.json() ?? { title: 'Superhome Scheduler', body: 'New Notification!', data: { url: '/' } };

	const options = {
		body: data.body,
		icon: '/android-chrome-192x192.png',
		badge: '/android-chrome-512x512.png',
		data: {
			url: data.data?.url || '/' // Pass the URL to the notification object
		}
	};

	event.waitUntil(
		self.registration.showNotification(data.title, options)
	);
});

// 2. HANDLER: This wakes up when the user clicks the notification
self.addEventListener('notificationclick', (event: any) => {
	event.notification.close();
	const urlToOpen = event.notification.data.url;

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
			for (let client of windowClients) {
				if (client.url === urlToOpen && 'focus' in client) {
					return client.focus();
				}
			}
			if (clients.openWindow) {
				return clients.openWindow(urlToOpen);
			}
		})
	);
});