import { c as create_ssr_component, b as subscribe } from './index3-9a6d7026.js';
import { u as user } from './stores2-2fbb3163.js';
import './index2-be97e17a.js';
import './firebase-abda0d73.js';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'axios';
import './datetimeUtils-b60811f0.js';
import 'dayjs';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';

function client_method(key) {
  {
    if (key === "before_navigate" || key === "after_navigate" || key === "on_navigate") {
      return () => {
      };
    } else {
      const name_lookup = {
        disable_scroll_handling: "disableScrollHandling",
        preload_data: "preloadData",
        preload_code: "preloadCode",
        invalidate_all: "invalidateAll"
      };
      return () => {
        throw new Error(`Cannot call ${name_lookup[key] ?? key}(...) on the server`);
      };
    }
  }
}
const goto = /* @__PURE__ */ client_method("goto");
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $user, $$unsubscribe_user;
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  {
    {
      if ($user) {
        goto("/");
      }
    }
  }
  $$unsubscribe_user();
  return `<p style="text-align: center">Sorry! Seems We&#39;re having trouble communicating with the server right now. Please try again later.
</p>
<div style="width: 100%; text-align: center"><a href="/"><button>Home</button></a></div>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-3b73d9a9.js.map
