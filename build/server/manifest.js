const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["android-chrome-192x192.png","android-chrome-512x512.png","apple-touch-icon.png","browserconfig.xml","favicon-16x16.png","favicon-32x32.png","favicon.ico","favicon.png","guide-link.webp","mstile-150x150.png","safari-pinned-tab.svg","site.webmanifest"]),
	mimeTypes: {".png":"image/png",".xml":"application/xml",".webp":"image/webp",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"},
	_: {
		client: {"start":"_app/immutable/entry/start.b92c6d9c.js","app":"_app/immutable/entry/app.da52e6df.js","imports":["_app/immutable/entry/start.b92c6d9c.js","_app/immutable/chunks/index.8e4fed50.js","_app/immutable/chunks/singletons.daa49798.js","_app/immutable/chunks/parse.bee59afc.js","_app/immutable/entry/app.da52e6df.js","_app/immutable/chunks/index.8e4fed50.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-162bc920.js')),
			__memo(() => import('./chunks/1-3e88e92c.js')),
			__memo(() => import('./chunks/2-bb14e8d9.js')),
			__memo(() => import('./chunks/3-0550b8ea.js')),
			__memo(() => import('./chunks/4-8b92eea4.js')),
			__memo(() => import('./chunks/5-05177795.js')),
			__memo(() => import('./chunks/6-14e0e0a9.js')),
			__memo(() => import('./chunks/7-83ce484c.js')),
			__memo(() => import('./chunks/8-8504b563.js')),
			__memo(() => import('./chunks/9-d62fb3a2.js')),
			__memo(() => import('./chunks/10-f9d9a89e.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/approveAll",
				pattern: /^\/api\/approveAll\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-852eb381.js'))
			},
			{
				id: "/api/assignBuoysToBoats",
				pattern: /^\/api\/assignBuoysToBoats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-fd66ce66.js'))
			},
			{
				id: "/api/backupDB",
				pattern: /^\/api\/backupDB\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-93ac2eb5.js'))
			},
			{
				id: "/api/downloadDatabase",
				pattern: /^\/api\/downloadDatabase\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-f9711253.js'))
			},
			{
				id: "/api/facebook/deletion",
				pattern: /^\/api\/facebook\/deletion\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-67b61ff9.js'))
			},
			{
				id: "/api/getBoatAssignments",
				pattern: /^\/api\/getBoatAssignments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-d86a7c0f.js'))
			},
			{
				id: "/api/getBuoys",
				pattern: /^\/api\/getBuoys\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-45dd9554.js'))
			},
			{
				id: "/api/getReservationsByDate",
				pattern: /^\/api\/getReservationsByDate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-928349ef.js'))
			},
			{
				id: "/api/getSession",
				pattern: /^\/api\/getSession\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-af868f6b.js'))
			},
			{
				id: "/api/getUserPastReservations",
				pattern: /^\/api\/getUserPastReservations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ea39648a.js'))
			},
			{
				id: "/api/getUsers",
				pattern: /^\/api\/getUsers\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-b260dba7.js'))
			},
			{
				id: "/api/lockBuoyAssignments",
				pattern: /^\/api\/lockBuoyAssignments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-0ef787b5.js'))
			},
			{
				id: "/api/login",
				pattern: /^\/api\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-4446e684.js'))
			},
			{
				id: "/api/logout",
				pattern: /^\/api\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-1ab28a6b.js'))
			},
			{
				id: "/api/notifications",
				pattern: /^\/api\/notifications\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-fc490d8b.js'))
			},
			{
				id: "/api/ow/[date]/admin-comments",
				pattern: /^\/api\/ow\/([^/]+?)\/admin-comments\/?$/,
				params: [{"name":"date","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-f568e2ea.js'))
			},
			{
				id: "/api/ow/[date]/boat-assignments",
				pattern: /^\/api\/ow\/([^/]+?)\/boat-assignments\/?$/,
				params: [{"name":"date","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-b916823a.js'))
			},
			{
				id: "/api/reports/reservations",
				pattern: /^\/api\/reports\/reservations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-af196956.js'))
			},
			{
				id: "/api/updatePrices",
				pattern: /^\/api\/updatePrices\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-d2be80f7.js'))
			},
			{
				id: "/api/updateViewMode",
				pattern: /^\/api\/updateViewMode\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-bb4f7c94.js'))
			},
			{
				id: "/api/users/reservations",
				pattern: /^\/api\/users\/reservations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-607024ab.js'))
			},
			{
				id: "/error",
				pattern: /^\/error\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/facebook/data-deletion-status",
				pattern: /^\/facebook\/data-deletion-status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-1a30ca08.js'))
			},
			{
				id: "/health",
				pattern: /^\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-2a4c37ae.js'))
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/multi-day/[category]",
				pattern: /^\/multi-day\/([^/]+?)\/?$/,
				params: [{"name":"category","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/privacy",
				pattern: /^\/privacy\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/single-day/classroom/[day]",
				pattern: /^\/single-day\/classroom\/([^/]+?)\/?$/,
				params: [{"name":"day","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/single-day/openwater/[day]",
				pattern: /^\/single-day\/openwater\/([^/]+?)\/?$/,
				params: [{"name":"day","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/single-day/pool/[day]",
				pattern: /^\/single-day\/pool\/([^/]+?)\/?$/,
				params: [{"name":"day","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
}
})();

const prerendered = new Set([]);

export { manifest, prerendered };
//# sourceMappingURL=manifest.js.map
