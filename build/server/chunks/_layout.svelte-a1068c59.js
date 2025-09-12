import { c as create_ssr_component } from './index3-9a6d7026.js';
import './firebase-abda0d73.js';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let isFacebook;
  isFacebook = typeof window !== "undefined" && window.navigator ? navigator.userAgent.includes("FBAN") || navigator.userAgent.includes("FBAV") : false;
  return `<div id="app" class="flex px-1 mx-auto w-full"><main class="lg:ml-72 w-full mx-auto">${slots.default ? slots.default({}) : ``}</main></div>

${isFacebook ? `<article class="fixed text-center top-0 w-full h-full bg-orange-400 p-20"><h1 class="font-bold">Please don&#39;t use Facebook browser</h1>
		<br>
		<p>To use default browser:</p>
		<ul><li><b>Android -</b> tap in the upper right-hand corner</li>
			<li><b>iOS -</b> tap in the lower right-hand corner</li></ul></article>` : ``}`;
});

export { Layout as default };
//# sourceMappingURL=_layout.svelte-a1068c59.js.map
