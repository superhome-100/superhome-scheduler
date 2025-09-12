import { g as getSettings } from './settings2-3108d47d.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import './settingsManager-25266b11.js';

async function load() {
  try {
    console.log("[layout.server] load called");
  } catch {
  }
  const settings = await getSettings();
  return {
    settings
  };
}

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-04dcc8e2.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.476b196d.js","_app/immutable/chunks/index.8e4fed50.js","_app/immutable/chunks/lodash.ee5632eb.js","_app/immutable/chunks/stores.cbfdd944.js","_app/immutable/chunks/singletons.daa49798.js","_app/immutable/chunks/firebase.81e41ff6.js","_app/immutable/chunks/forms.ca44f84b.js","_app/immutable/chunks/parse.bee59afc.js","_app/immutable/chunks/stores.c715e8c8.js","_app/immutable/chunks/Popup.e2ab39b7.js"];
const stylesheets = ["_app/immutable/assets/0.926986c0.css","_app/immutable/assets/app.3f7ca999.css","_app/immutable/assets/forms.7df9bea5.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-162bc920.js.map
