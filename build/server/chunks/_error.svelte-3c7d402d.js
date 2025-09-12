import { c as create_ssr_component, b as subscribe, e as escape } from './index3-9a6d7026.js';
import { p as page } from './stores-19d63d23.js';

const Error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_page();
  return `<div class="text-lg font-semibold">${escape($page.error.message)}</div>`;
});

export { Error as default };
//# sourceMappingURL=_error.svelte-3c7d402d.js.map
