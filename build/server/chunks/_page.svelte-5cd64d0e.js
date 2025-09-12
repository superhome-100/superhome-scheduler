import { c as create_ssr_component } from './index3-9a6d7026.js';
import './firebase-abda0d73.js';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let session = "loading";
  var ShowStep = ((ShowStep2) => {
    ShowStep2[ShowStep2["LOGIN_OPTION"] = 0] = "LOGIN_OPTION";
    ShowStep2[ShowStep2["NEW_OLD_USER_CONFIRMATION"] = 1] = "NEW_OLD_USER_CONFIRMATION";
    ShowStep2[ShowStep2["CONFIRM_LINK_GOOGLE"] = 2] = "CONFIRM_LINK_GOOGLE";
    ShowStep2[ShowStep2["REQUIRE_FB_LOGIN_FIRST"] = 3] = "REQUIRE_FB_LOGIN_FIRST";
    return ShowStep2;
  })(ShowStep || {});
  let showStep = 0;
  return `<div class="flex flex-col text-black w-48 gap-2">${showStep === ShowStep.LOGIN_OPTION ? `<h3 class="dark:text-white">Login with</h3>
		<button ${["loading", "in"].includes(session) ? "disabled" : ""}>Google</button>
		<button ${["loading", "in"].includes(session) ? "disabled" : ""}>Facebook</button>` : `${showStep === ShowStep.NEW_OLD_USER_CONFIRMATION ? `<p class="dark:text-white">Do you have an existing superhome account via facebook?</p>
		<button>Yes</button>
		<button>No</button>` : `${showStep === ShowStep.CONFIRM_LINK_GOOGLE ? `<p class="dark:text-white">Did you link your google account on us already?</p>
		<img src="/guide-link.webp" alt="guide">
		<button>Yes</button>
		<button>No</button>` : `${showStep === ShowStep.REQUIRE_FB_LOGIN_FIRST ? `<p class="dark:text-white">Please login with Facebook first to link your Google account</p>
		<p class="dark:text-white">Click link google account at the sidebar after logging in</p>
		<button>Login with Facebook</button>` : ``}`}`}`}
	<a class="dark:text-white underline" target="_blank" href="https://app.freedivesuperhome.com/privacy" rel="noreferrer">Privacy Policy</a></div>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-5cd64d0e.js.map
