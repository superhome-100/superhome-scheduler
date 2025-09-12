function load({ params }) {
  return params;
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 10;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-834ecb77.js')).default;
const server_id = "src/routes/single-day/pool/[day]/+page.server.js";
const imports = ["_app/immutable/nodes/10.193b21a6.js","_app/immutable/chunks/index.8e4fed50.js","_app/immutable/chunks/stores.c715e8c8.js","_app/immutable/chunks/singletons.daa49798.js","_app/immutable/chunks/index.esm.a8d17a83.js","_app/immutable/chunks/forms.ca44f84b.js","_app/immutable/chunks/parse.bee59afc.js","_app/immutable/chunks/firebase.81e41ff6.js","_app/immutable/chunks/stores.cbfdd944.js","_app/immutable/chunks/LoadingBar.e3e09623.js","_app/immutable/chunks/DayHourly.3af5b86e.js","_app/immutable/chunks/RsvTabs.453366a9.js"];
const stylesheets = ["_app/immutable/assets/index.a4b8bbdd.css","_app/immutable/assets/forms.7df9bea5.css","_app/immutable/assets/LoadingBar.08f79af4.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=10-f9d9a89e.js.map
