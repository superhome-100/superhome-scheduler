import { c as create_ssr_component, b as subscribe, d as set_store_value, v as validate_component, e as escape, f as add_attribute, h as each, j as getContext, o as onDestroy, k as add_styles, l as compute_rest_props, p as spread, q as escape_attribute_value, t as escape_object, u as is_void, s as setContext, w as createEventDispatcher, m as missing_component, x as merge_ssr_styles, y as compute_slots, z as assign, A as now, B as loop, n as noop, C as identity } from './index3-9a6d7026.js';
import 'lodash';
import { M as Modal, E as ExclamationCircle, u as useToasterStore, t as toast, p as prefersReducedMotion, s as startPause, e as endPause, a as update } from './ExclamationCircle-dc9ffda9.js';
import { w as writable } from './index2-be97e17a.js';
import { p as page, n as navigating } from './stores-19d63d23.js';
import { l as loginState, u as user, a as stateLoaded, p as profileSrc, b as users, v as viewMode, n as notifications, s as settings, c as view } from './stores2-2fbb3163.js';
import { i as isGoogleLinked, a as auth } from './firebase-abda0d73.js';
import './datetimeUtils-b60811f0.js';
import 'axios';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'dayjs';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var classnames = {exports: {}};

/*!
	Copyright (c) 2018 Jed Watson.
	Licensed under the MIT License (MIT), see
	http://jedwatson.github.io/classnames
*/

var hasRequiredClassnames;

function requireClassnames () {
	if (hasRequiredClassnames) return classnames.exports;
	hasRequiredClassnames = 1;
	(function (module) {
		/* global define */

		(function () {

			var hasOwn = {}.hasOwnProperty;

			function classNames () {
				var classes = '';

				for (var i = 0; i < arguments.length; i++) {
					var arg = arguments[i];
					if (arg) {
						classes = appendClass(classes, parseValue(arg));
					}
				}

				return classes;
			}

			function parseValue (arg) {
				if (typeof arg === 'string' || typeof arg === 'number') {
					return arg;
				}

				if (typeof arg !== 'object') {
					return '';
				}

				if (Array.isArray(arg)) {
					return classNames.apply(null, arg);
				}

				if (arg.toString !== Object.prototype.toString && !arg.toString.toString().includes('[native code]')) {
					return arg.toString();
				}

				var classes = '';

				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes = appendClass(classes, key);
					}
				}

				return classes;
			}

			function appendClass (value, newClass) {
				if (!newClass) {
					return value;
				}
			
				if (value) {
					return value + ' ' + newClass;
				}
			
				return value + newClass;
			}

			if (module.exports) {
				classNames.default = classNames;
				module.exports = classNames;
			} else {
				window.classNames = classNames;
			}
		}()); 
	} (classnames));
	return classnames.exports;
}

var classnamesExports = requireClassnames();
var classNames = /*@__PURE__*/getDefaultExportFromCjs(classnamesExports);

function calculateOffset(toast2, $toasts, opts) {
  const { reverseOrder, gutter = 8, defaultPosition } = opts || {};
  const relevantToasts = $toasts.filter((t) => (t.position || defaultPosition) === (toast2.position || defaultPosition) && t.height);
  const toastIndex = relevantToasts.findIndex((t) => t.id === toast2.id);
  const toastsBefore = relevantToasts.filter((toast3, i) => i < toastIndex && toast3.visible).length;
  const offset = relevantToasts.filter((t) => t.visible).slice(...reverseOrder ? [toastsBefore + 1] : [0, toastsBefore]).reduce((acc, t) => acc + (t.height || 0) + gutter, 0);
  return offset;
}
const handlers = {
  startPause() {
    startPause(Date.now());
  },
  endPause() {
    endPause(Date.now());
  },
  updateHeight: (toastId, height) => {
    update({ id: toastId, height });
  },
  calculateOffset
};
function useToaster(toastOptions) {
  const { toasts, pausedAt } = useToasterStore(toastOptions);
  const timeouts = /* @__PURE__ */ new Map();
  let _pausedAt;
  const unsubscribes = [
    pausedAt.subscribe(($pausedAt) => {
      if ($pausedAt) {
        for (const [, timeoutId] of timeouts) {
          clearTimeout(timeoutId);
        }
        timeouts.clear();
      }
      _pausedAt = $pausedAt;
    }),
    toasts.subscribe(($toasts) => {
      if (_pausedAt) {
        return;
      }
      const now2 = Date.now();
      for (const t of $toasts) {
        if (timeouts.has(t.id)) {
          continue;
        }
        if (t.duration === Infinity) {
          continue;
        }
        const durationLeft = (t.duration || 0) + t.pauseDuration - (now2 - t.createdAt);
        if (durationLeft < 0) {
          if (t.visible) {
            toast.dismiss(t.id);
          }
          return null;
        }
        timeouts.set(t.id, setTimeout(() => toast.dismiss(t.id), durationLeft));
      }
    })
  ];
  onDestroy(() => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  });
  return { toasts, handlers };
}
const css$9 = {
  code: "div.svelte-11kvm4p{width:20px;opacity:0;height:20px;border-radius:10px;background:var(--primary, #61d345);position:relative;transform:rotate(45deg);animation:svelte-11kvm4p-circleAnimation 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;animation-delay:100ms}div.svelte-11kvm4p::after{content:'';box-sizing:border-box;animation:svelte-11kvm4p-checkmarkAnimation 0.2s ease-out forwards;opacity:0;animation-delay:200ms;position:absolute;border-right:2px solid;border-bottom:2px solid;border-color:var(--secondary, #fff);bottom:6px;left:6px;height:10px;width:6px}@keyframes svelte-11kvm4p-circleAnimation{from{transform:scale(0) rotate(45deg);opacity:0}to{transform:scale(1) rotate(45deg);opacity:1}}@keyframes svelte-11kvm4p-checkmarkAnimation{0%{height:0;width:0;opacity:0}40%{height:0;width:6px;opacity:1}100%{opacity:1;height:10px}}",
  map: null
};
const CheckmarkIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { primary = "#61d345" } = $$props;
  let { secondary = "#fff" } = $$props;
  if ($$props.primary === void 0 && $$bindings.primary && primary !== void 0)
    $$bindings.primary(primary);
  if ($$props.secondary === void 0 && $$bindings.secondary && secondary !== void 0)
    $$bindings.secondary(secondary);
  $$result.css.add(css$9);
  return `


<div class="svelte-11kvm4p"${add_styles({
    "--primary": primary,
    "--secondary": secondary
  })}></div>`;
});
const css$8 = {
  code: "div.svelte-1ee93ns{width:20px;opacity:0;height:20px;border-radius:10px;background:var(--primary, #ff4b4b);position:relative;transform:rotate(45deg);animation:svelte-1ee93ns-circleAnimation 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;animation-delay:100ms}div.svelte-1ee93ns::after,div.svelte-1ee93ns::before{content:'';animation:svelte-1ee93ns-firstLineAnimation 0.15s ease-out forwards;animation-delay:150ms;position:absolute;border-radius:3px;opacity:0;background:var(--secondary, #fff);bottom:9px;left:4px;height:2px;width:12px}div.svelte-1ee93ns:before{animation:svelte-1ee93ns-secondLineAnimation 0.15s ease-out forwards;animation-delay:180ms;transform:rotate(90deg)}@keyframes svelte-1ee93ns-circleAnimation{from{transform:scale(0) rotate(45deg);opacity:0}to{transform:scale(1) rotate(45deg);opacity:1}}@keyframes svelte-1ee93ns-firstLineAnimation{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}@keyframes svelte-1ee93ns-secondLineAnimation{from{transform:scale(0) rotate(90deg);opacity:0}to{transform:scale(1) rotate(90deg);opacity:1}}",
  map: null
};
const ErrorIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { primary = "#ff4b4b" } = $$props;
  let { secondary = "#fff" } = $$props;
  if ($$props.primary === void 0 && $$bindings.primary && primary !== void 0)
    $$bindings.primary(primary);
  if ($$props.secondary === void 0 && $$bindings.secondary && secondary !== void 0)
    $$bindings.secondary(secondary);
  $$result.css.add(css$8);
  return `


<div class="svelte-1ee93ns"${add_styles({
    "--primary": primary,
    "--secondary": secondary
  })}></div>`;
});
const css$7 = {
  code: "div.svelte-1j7dflg{width:12px;height:12px;box-sizing:border-box;border:2px solid;border-radius:100%;border-color:var(--secondary, #e0e0e0);border-right-color:var(--primary, #616161);animation:svelte-1j7dflg-rotate 1s linear infinite}@keyframes svelte-1j7dflg-rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
  map: null
};
const LoaderIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { primary = "#616161" } = $$props;
  let { secondary = "#e0e0e0" } = $$props;
  if ($$props.primary === void 0 && $$bindings.primary && primary !== void 0)
    $$bindings.primary(primary);
  if ($$props.secondary === void 0 && $$bindings.secondary && secondary !== void 0)
    $$bindings.secondary(secondary);
  $$result.css.add(css$7);
  return `


<div class="svelte-1j7dflg"${add_styles({
    "--primary": primary,
    "--secondary": secondary
  })}></div>`;
});
const css$6 = {
  code: ".indicator.svelte-1kgeier{position:relative;display:flex;justify-content:center;align-items:center;min-width:20px;min-height:20px}.status.svelte-1kgeier{position:absolute}.animated.svelte-1kgeier{position:relative;transform:scale(0.6);opacity:0.4;min-width:20px;animation:svelte-1kgeier-enter 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards}@keyframes svelte-1kgeier-enter{from{transform:scale(0.6);opacity:0.4}to{transform:scale(1);opacity:1}}",
  map: null
};
const ToastIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let type;
  let icon;
  let iconTheme;
  let { toast: toast2 } = $$props;
  if ($$props.toast === void 0 && $$bindings.toast && toast2 !== void 0)
    $$bindings.toast(toast2);
  $$result.css.add(css$6);
  ({ type, icon, iconTheme } = toast2);
  return `${typeof icon === "string" ? `<div class="animated svelte-1kgeier">${escape(icon)}</div>` : `${typeof icon !== "undefined" ? `${validate_component(icon || missing_component, "svelte:component").$$render($$result, {}, {}, {})}` : `${type !== "blank" ? `<div class="indicator svelte-1kgeier">${validate_component(LoaderIcon, "LoaderIcon").$$render($$result, Object.assign({}, iconTheme), {}, {})}
		${type !== "loading" ? `<div class="status svelte-1kgeier">${type === "error" ? `${validate_component(ErrorIcon, "ErrorIcon").$$render($$result, Object.assign({}, iconTheme), {}, {})}` : `${validate_component(CheckmarkIcon, "CheckmarkIcon").$$render($$result, Object.assign({}, iconTheme), {}, {})}`}</div>` : ``}</div>` : ``}`}`}`;
});
const css$5 = {
  code: ".message.svelte-1nauejd{display:flex;justify-content:center;margin:4px 10px;color:inherit;flex:1 1 auto;white-space:pre-line}",
  map: null
};
const ToastMessage = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { toast: toast2 } = $$props;
  if ($$props.toast === void 0 && $$bindings.toast && toast2 !== void 0)
    $$bindings.toast(toast2);
  $$result.css.add(css$5);
  return `<div${spread([{ class: "message" }, escape_object(toast2.ariaProps)], { classes: "svelte-1nauejd" })}>${typeof toast2.message === "string" ? `${escape(toast2.message)}` : `${validate_component(toast2.message || missing_component, "svelte:component").$$render($$result, { toast: toast2 }, {}, {})}`}
</div>`;
});
const css$4 = {
  code: "@keyframes svelte-ug60r4-enterAnimation{0%{transform:translate3d(0, calc(var(--factor) * -200%), 0) scale(0.6);opacity:0.5}100%{transform:translate3d(0, 0, 0) scale(1);opacity:1}}@keyframes svelte-ug60r4-exitAnimation{0%{transform:translate3d(0, 0, -1px) scale(1);opacity:1}100%{transform:translate3d(0, calc(var(--factor) * -150%), -1px) scale(0.6);opacity:0}}@keyframes svelte-ug60r4-fadeInAnimation{0%{opacity:0}100%{opacity:1}}@keyframes svelte-ug60r4-fadeOutAnimation{0%{opacity:1}100%{opacity:0}}.base.svelte-ug60r4{display:flex;align-items:center;background:#fff;color:#363636;line-height:1.3;will-change:transform;box-shadow:0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);max-width:350px;pointer-events:auto;padding:8px 10px;border-radius:8px}.transparent.svelte-ug60r4{opacity:0}.enter.svelte-ug60r4{animation:svelte-ug60r4-enterAnimation 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards}.exit.svelte-ug60r4{animation:svelte-ug60r4-exitAnimation 0.4s cubic-bezier(0.06, 0.71, 0.55, 1) forwards}.fadeIn.svelte-ug60r4{animation:svelte-ug60r4-fadeInAnimation 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards}.fadeOut.svelte-ug60r4{animation:svelte-ug60r4-fadeOutAnimation 0.4s cubic-bezier(0.06, 0.71, 0.55, 1) forwards}",
  map: null
};
const ToastBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { toast: toast2 } = $$props;
  let { position = void 0 } = $$props;
  let { style = "" } = $$props;
  let { Component = void 0 } = $$props;
  let factor;
  let animation;
  if ($$props.toast === void 0 && $$bindings.toast && toast2 !== void 0)
    $$bindings.toast(toast2);
  if ($$props.position === void 0 && $$bindings.position && position !== void 0)
    $$bindings.position(position);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.Component === void 0 && $$bindings.Component && Component !== void 0)
    $$bindings.Component(Component);
  $$result.css.add(css$4);
  {
    {
      const top = (toast2.position || position || "top-center").includes("top");
      factor = top ? 1 : -1;
      const [enter, exit] = prefersReducedMotion() ? ["fadeIn", "fadeOut"] : ["enter", "exit"];
      animation = toast2.visible ? enter : exit;
    }
  }
  return `<div class="${"base " + escape(toast2.height ? animation : "transparent", true) + " " + escape(toast2.className || "", true) + " svelte-ug60r4"}"${add_styles(merge_ssr_styles(escape(style, true) + "; " + escape(toast2.style, true), { "--factor": factor }))}>${Component ? `${validate_component(Component || missing_component, "svelte:component").$$render($$result, {}, {}, {
    message: () => {
      return `${validate_component(ToastMessage, "ToastMessage").$$render($$result, { toast: toast2, slot: "message" }, {}, {})}`;
    },
    icon: () => {
      return `${validate_component(ToastIcon, "ToastIcon").$$render($$result, { toast: toast2, slot: "icon" }, {}, {})}`;
    }
  })}` : `${slots.default ? slots.default({ ToastIcon, ToastMessage, toast: toast2 }) : `
			${validate_component(ToastIcon, "ToastIcon").$$render($$result, { toast: toast2 }, {}, {})}
			${validate_component(ToastMessage, "ToastMessage").$$render($$result, { toast: toast2 }, {}, {})}
		`}`}
</div>`;
});
const css$3 = {
  code: ".wrapper.svelte-v01oml{left:0;right:0;display:flex;position:absolute;transform:translateY(calc(var(--offset, 16px) * var(--factor) * 1px))}.transition.svelte-v01oml{transition:all 230ms cubic-bezier(0.21, 1.02, 0.73, 1)}.active.svelte-v01oml{z-index:9999}.active.svelte-v01oml>*{pointer-events:auto}",
  map: null
};
const ToastWrapper = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let top;
  let bottom;
  let factor;
  let justifyContent;
  let { toast: toast2 } = $$props;
  let { setHeight } = $$props;
  let wrapperEl;
  if ($$props.toast === void 0 && $$bindings.toast && toast2 !== void 0)
    $$bindings.toast(toast2);
  if ($$props.setHeight === void 0 && $$bindings.setHeight && setHeight !== void 0)
    $$bindings.setHeight(setHeight);
  $$result.css.add(css$3);
  top = toast2.position?.includes("top") ? 0 : null;
  bottom = toast2.position?.includes("bottom") ? 0 : null;
  factor = toast2.position?.includes("top") ? 1 : -1;
  justifyContent = toast2.position?.includes("center") && "center" || (toast2.position?.includes("right") || toast2.position?.includes("end")) && "flex-end" || null;
  return `<div class="${[
    "wrapper svelte-v01oml",
    (toast2.visible ? "active" : "") + " " + (!prefersReducedMotion() ? "transition" : "")
  ].join(" ").trim()}"${add_styles({
    "--factor": factor,
    "--offset": toast2.offset,
    top,
    bottom,
    "justify-content": justifyContent
  })}${add_attribute("this", wrapperEl, 0)}>${toast2.type === "custom" ? `${validate_component(ToastMessage, "ToastMessage").$$render($$result, { toast: toast2 }, {}, {})}` : `${slots.default ? slots.default({ toast: toast2 }) : `
			${validate_component(ToastBar, "ToastBar").$$render($$result, { toast: toast2, position: toast2.position }, {}, {})}
		`}`}
</div>`;
});
const css$2 = {
  code: ".toaster.svelte-1phplh9{--default-offset:16px;position:fixed;z-index:9999;top:var(--default-offset);left:var(--default-offset);right:var(--default-offset);bottom:var(--default-offset);pointer-events:none}",
  map: null
};
const Toaster = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $toasts, $$unsubscribe_toasts;
  let { reverseOrder = false } = $$props;
  let { position = "top-center" } = $$props;
  let { toastOptions = void 0 } = $$props;
  let { gutter = 8 } = $$props;
  let { containerStyle = void 0 } = $$props;
  let { containerClassName = void 0 } = $$props;
  const { toasts, handlers: handlers2 } = useToaster(toastOptions);
  $$unsubscribe_toasts = subscribe(toasts, (value) => $toasts = value);
  let _toasts;
  if ($$props.reverseOrder === void 0 && $$bindings.reverseOrder && reverseOrder !== void 0)
    $$bindings.reverseOrder(reverseOrder);
  if ($$props.position === void 0 && $$bindings.position && position !== void 0)
    $$bindings.position(position);
  if ($$props.toastOptions === void 0 && $$bindings.toastOptions && toastOptions !== void 0)
    $$bindings.toastOptions(toastOptions);
  if ($$props.gutter === void 0 && $$bindings.gutter && gutter !== void 0)
    $$bindings.gutter(gutter);
  if ($$props.containerStyle === void 0 && $$bindings.containerStyle && containerStyle !== void 0)
    $$bindings.containerStyle(containerStyle);
  if ($$props.containerClassName === void 0 && $$bindings.containerClassName && containerClassName !== void 0)
    $$bindings.containerClassName(containerClassName);
  $$result.css.add(css$2);
  _toasts = $toasts.map((toast2) => ({
    ...toast2,
    position: toast2.position || position,
    offset: handlers2.calculateOffset(toast2, $toasts, {
      reverseOrder,
      gutter,
      defaultPosition: position
    })
  }));
  $$unsubscribe_toasts();
  return `<div class="${"toaster " + escape(containerClassName || "", true) + " svelte-1phplh9"}"${add_attribute("style", containerStyle, 0)} role="alert">${each(_toasts, (toast2) => {
    return `${validate_component(ToastWrapper, "ToastWrapper").$$render(
      $$result,
      {
        toast: toast2,
        setHeight: (height) => handlers2.updateHeight(toast2.id, height)
      },
      {},
      {}
    )}`;
  })}
</div>`;
});
const sessionAuth = writable();
const Frame = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "tag",
    "color",
    "rounded",
    "border",
    "shadow",
    "transition",
    "params",
    "node",
    "use",
    "options"
  ]);
  setContext("background", true);
  let { tag = "div" } = $$props;
  let { color = "default" } = $$props;
  let { rounded = false } = $$props;
  let { border = false } = $$props;
  let { shadow = false } = $$props;
  let { transition = void 0 } = $$props;
  let { params = {} } = $$props;
  let { node = void 0 } = $$props;
  let { use = noop } = $$props;
  let { options = {} } = $$props;
  const bgColors = {
    gray: "bg-gray-50 dark:bg-gray-800",
    red: "bg-red-50 dark:bg-gray-800",
    yellow: "bg-yellow-50 dark:bg-gray-800 ",
    green: "bg-green-50 dark:bg-gray-800 ",
    indigo: "bg-indigo-50 dark:bg-gray-800 ",
    purple: "bg-purple-50 dark:bg-gray-800 ",
    pink: "bg-pink-50 dark:bg-gray-800 ",
    blue: "bg-blue-50 dark:bg-gray-800 ",
    light: "bg-gray-50 dark:bg-gray-700",
    dark: "bg-gray-50 dark:bg-gray-800",
    default: "bg-white dark:bg-gray-800",
    dropdown: "bg-white dark:bg-gray-700",
    navbar: "bg-white dark:bg-gray-900",
    navbarUl: "bg-gray-50 dark:bg-gray-800",
    form: "bg-gray-50 dark:bg-gray-700",
    primary: "bg-primary-50 dark:bg-gray-800 ",
    none: ""
  };
  const textColors = {
    gray: "text-gray-800 dark:text-gray-300",
    red: "text-red-800 dark:text-red-400",
    yellow: "text-yellow-800 dark:text-yellow-300",
    green: "text-green-800 dark:text-green-400",
    indigo: "text-indigo-800 dark:text-indigo-400",
    purple: "text-purple-800 dark:text-purple-400",
    pink: "text-pink-800 dark:text-pink-400",
    blue: "text-blue-800 dark:text-blue-400",
    light: "text-gray-700 dark:text-gray-300",
    dark: "text-gray-700 dark:text-gray-300",
    default: "text-gray-500 dark:text-gray-400",
    dropdown: "text-gray-700 dark:text-gray-200",
    navbar: "text-gray-700 dark:text-gray-200",
    navbarUl: "text-gray-700 dark:text-gray-400",
    form: "text-gray-900 dark:text-white",
    primary: "text-primary-800 dark:text-primary-400",
    none: ""
  };
  const borderColors = {
    gray: "border-gray-300 dark:border-gray-800",
    red: "border-red-300 dark:border-red-800",
    yellow: "border-yellow-300 dark:border-yellow-800",
    green: "border-green-300 dark:border-green-800",
    indigo: "border-indigo-300 dark:border-indigo-800",
    purple: "border-purple-300 dark:border-purple-800",
    pink: "border-pink-300 dark:border-pink-800",
    blue: "border-blue-300 dark:border-blue-800",
    light: "border-gray-500",
    dark: "border-gray-500",
    default: "border-gray-200 dark:border-gray-700",
    dropdown: "border-gray-100 dark:border-gray-700",
    navbar: "border-gray-100 dark:border-gray-700",
    navbarUl: "border-gray-100 dark:border-gray-700",
    form: "border-gray-300 dark:border-gray-700",
    primary: "border-primary-500 dark:bg-primary-200 ",
    none: ""
  };
  let divClass;
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0)
    $$bindings.tag(tag);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.rounded === void 0 && $$bindings.rounded && rounded !== void 0)
    $$bindings.rounded(rounded);
  if ($$props.border === void 0 && $$bindings.border && border !== void 0)
    $$bindings.border(border);
  if ($$props.shadow === void 0 && $$bindings.shadow && shadow !== void 0)
    $$bindings.shadow(shadow);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.params === void 0 && $$bindings.params && params !== void 0)
    $$bindings.params(params);
  if ($$props.node === void 0 && $$bindings.node && node !== void 0)
    $$bindings.node(node);
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.options === void 0 && $$bindings.options && options !== void 0)
    $$bindings.options(options);
  {
    setContext("color", color);
  }
  divClass = classNames(bgColors[color], textColors[color], rounded && (color === "dropdown" ? "rounded" : "rounded-lg"), border && "border", borderColors[color], shadow && "shadow-md", $$props.class);
  return `${transition ? `${((tag$1) => {
    return tag$1 ? `<${tag}${spread([escape_object($$restProps), { class: escape_attribute_value(divClass) }], {})}${add_attribute("this", node, 0)}>${is_void(tag$1) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag$1) ? "" : `</${tag$1}>`}` : "";
  })(tag)}` : `${((tag$1) => {
    return tag$1 ? `<${tag}${spread([escape_object($$restProps), { class: escape_attribute_value(divClass) }], {})}${add_attribute("this", node, 0)}>${is_void(tag$1) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag$1) ? "" : `</${tag$1}>`}` : "";
  })(tag)}`}`;
});
const ChevronDown = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["size", "color", "variation", "ariaLabel"]);
  let { size = "20" } = $$props;
  let { color = "currentColor" } = $$props;
  let { variation = "outline" } = $$props;
  let { ariaLabel = "chevron down" } = $$props;
  let viewBox;
  let svgpath;
  let svgoutline = `<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" stroke="${color}"></path>`;
  let svgsolid = `<path clip-rule="evenodd" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill="${color}"></path>`;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.variation === void 0 && $$bindings.variation && variation !== void 0)
    $$bindings.variation(variation);
  if ($$props.ariaLabel === void 0 && $$bindings.ariaLabel && ariaLabel !== void 0)
    $$bindings.ariaLabel(ariaLabel);
  {
    switch (variation) {
      case "outline":
        svgpath = svgoutline;
        viewBox = "0 0 20 20";
        break;
      case "solid":
        svgpath = svgsolid;
        viewBox = "0 0 20 20";
        break;
      default:
        svgpath = svgoutline;
        viewBox = "0 0 20 20";
    }
  }
  return `<svg${spread(
    [
      { xmlns: "http://www.w3.org/2000/svg" },
      { width: escape_attribute_value(size) },
      { height: escape_attribute_value(size) },
      {
        class: escape_attribute_value($$props.class)
      },
      escape_object($$restProps),
      {
        "aria-label": escape_attribute_value(ariaLabel)
      },
      { fill: "none" },
      { viewBox: escape_attribute_value(viewBox) },
      { "stroke-width": "2" }
    ],
    {}
  )}><!-- HTML_TAG_START -->${svgpath}<!-- HTML_TAG_END --></svg>`;
});
const ChevronUp = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["size", "color", "variation", "ariaLabel"]);
  let { size = "20" } = $$props;
  let { color = "currentColor" } = $$props;
  let { variation = "outline" } = $$props;
  let { ariaLabel = "chevron up" } = $$props;
  let viewBox;
  let svgpath;
  let svgoutline = `<path clip-rule="evenodd" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" stroke="${color}"></path>`;
  let svgsolid = `<path clip-rule="evenodd" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" fill="${color}"></path>`;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.variation === void 0 && $$bindings.variation && variation !== void 0)
    $$bindings.variation(variation);
  if ($$props.ariaLabel === void 0 && $$bindings.ariaLabel && ariaLabel !== void 0)
    $$bindings.ariaLabel(ariaLabel);
  {
    switch (variation) {
      case "outline":
        svgpath = svgoutline;
        viewBox = "0 0 20 20";
        break;
      case "solid":
        svgpath = svgsolid;
        viewBox = "0 0 20 20";
        break;
      default:
        svgpath = svgoutline;
        viewBox = "0 0 20 20";
    }
  }
  return `<svg${spread(
    [
      { xmlns: "http://www.w3.org/2000/svg" },
      { width: escape_attribute_value(size) },
      { height: escape_attribute_value(size) },
      {
        class: escape_attribute_value($$props.class)
      },
      escape_object($$restProps),
      {
        "aria-label": escape_attribute_value(ariaLabel)
      },
      { fill: "none" },
      { viewBox: escape_attribute_value(viewBox) },
      { "stroke-width": "2" }
    ],
    {}
  )}><!-- HTML_TAG_START -->${svgpath}<!-- HTML_TAG_END --></svg>`;
});
function cubicOut(t) {
  const f = t - 1;
  return f * f * f + 1;
}
function quintOut(t) {
  return --t * t * t * t * t + 1;
}
function sineIn(t) {
  const v = Math.cos(t * Math.PI * 0.5);
  if (Math.abs(v) < 1e-14)
    return 1;
  else
    return 1 - v;
}
const ToolbarButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["color", "name", "ariaLabel", "size", "href"]);
  const background = getContext("background");
  let { color = "default" } = $$props;
  let { name = void 0 } = $$props;
  let { ariaLabel = void 0 } = $$props;
  let { size = "md" } = $$props;
  let { href = void 0 } = $$props;
  const colors = {
    dark: "text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700",
    gray: "text-gray-500 focus:ring-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
    red: "text-red-500 focus:ring-red-400 hover:bg-red-200 dark:hover:bg-gray-700",
    yellow: "text-yellow-500 focus:ring-yellow-400 hover:bg-yellow-200 dark:hover:bg-gray-700",
    green: "text-green-500 focus:ring-green-400 hover:bg-green-200 dark:hover:bg-gray-700",
    indigo: "text-indigo-500 focus:ring-indigo-400 hover:bg-indigo-200 dark:hover:bg-gray-700",
    purple: "text-purple-500 focus:ring-purple-400 hover:bg-purple-200 dark:hover:bg-gray-700",
    pink: "text-pink-500 focus:ring-pink-400 hover:bg-pink-200 dark:hover:bg-gray-700",
    blue: "text-blue-500 focus:ring-blue-400 hover:bg-blue-200 dark:hover:bg-gray-700",
    default: "focus:ring-gray-400 "
  };
  const sizing = {
    xs: "m-0.5 rounded focus:ring-1 p-0.5",
    sm: "m-0.5 rounded focus:ring-1 p-0.5",
    md: "m-0.5 rounded-lg focus:ring-2 p-1.5",
    lg: "m-0.5 rounded-lg focus:ring-2 p-2.5"
  };
  let buttonClass;
  const svgSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-5 h-5"
  };
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.name === void 0 && $$bindings.name && name !== void 0)
    $$bindings.name(name);
  if ($$props.ariaLabel === void 0 && $$bindings.ariaLabel && ariaLabel !== void 0)
    $$bindings.ariaLabel(ariaLabel);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  buttonClass = classNames(
    "focus:outline-none whitespace-normal",
    sizing[size],
    colors[color],
    color === "default" && (background ? "hover:bg-gray-100 dark:hover:bg-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"),
    $$props.class
  );
  return `${href ? `<a${spread(
    [
      { href: escape_attribute_value(href) },
      escape_object($$restProps),
      {
        class: escape_attribute_value(buttonClass)
      },
      {
        "aria-label": escape_attribute_value(ariaLabel ?? name)
      }
    ],
    {}
  )}>${name ? `<span class="sr-only">${escape(name)}</span>` : ``}
    ${slots.default ? slots.default({ svgSize: svgSizes[size] }) : ``}</a>` : `<button${spread(
    [
      { type: "button" },
      escape_object($$restProps),
      {
        class: escape_attribute_value(buttonClass)
      },
      {
        "aria-label": escape_attribute_value(ariaLabel ?? name)
      }
    ],
    {}
  )}>${name ? `<span class="sr-only">${escape(name)}</span>` : ``}
    ${slots.default ? slots.default({ svgSize: svgSizes[size] }) : ``}</button>`}`;
});
const CloseButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["name"]);
  let { name = "Close" } = $$props;
  if ($$props.name === void 0 && $$bindings.name && name !== void 0)
    $$bindings.name(name);
  return `${validate_component(ToolbarButton, "ToolbarButton").$$render(
    $$result,
    Object.assign({}, { name }, $$restProps, {
      class: classNames("ml-auto", $$props.class)
    }),
    {},
    {
      default: ({ svgSize }) => {
        return `<svg${add_attribute("class", svgSize, 0)} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>`;
      }
    }
  )}`;
});
const Drawer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "activateClickOutside",
    "hidden",
    "position",
    "leftOffset",
    "rightOffset",
    "topOffset",
    "bottomOffset",
    "width",
    "backdrop",
    "bgColor",
    "bgOpacity",
    "placement",
    "id",
    "divClass",
    "transitionParams",
    "transitionType"
  ]);
  let { activateClickOutside = true } = $$props;
  let { hidden = true } = $$props;
  let { position = "fixed" } = $$props;
  let { leftOffset = "inset-y-0 left-0" } = $$props;
  let { rightOffset = "inset-y-0 right-0" } = $$props;
  let { topOffset = "inset-x-0 top-0" } = $$props;
  let { bottomOffset = "inset-x-0 bottom-0" } = $$props;
  let { width = "w-80" } = $$props;
  let { backdrop: backdrop2 = true } = $$props;
  let { bgColor = "bg-gray-900" } = $$props;
  let { bgOpacity = "bg-opacity-75" } = $$props;
  let { placement = "left" } = $$props;
  let { id = "drawer-example" } = $$props;
  let { divClass = "overflow-y-auto z-50 p-4 bg-white dark:bg-gray-800" } = $$props;
  let { transitionParams = {} } = $$props;
  let { transitionType = "fly" } = $$props;
  const placements = {
    left: leftOffset,
    right: rightOffset,
    top: topOffset,
    bottom: bottomOffset
  };
  let backdropDivClass = classNames("fixed top-0 left-0 z-50 w-full h-full", backdrop2 && bgColor, backdrop2 && bgOpacity);
  if ($$props.activateClickOutside === void 0 && $$bindings.activateClickOutside && activateClickOutside !== void 0)
    $$bindings.activateClickOutside(activateClickOutside);
  if ($$props.hidden === void 0 && $$bindings.hidden && hidden !== void 0)
    $$bindings.hidden(hidden);
  if ($$props.position === void 0 && $$bindings.position && position !== void 0)
    $$bindings.position(position);
  if ($$props.leftOffset === void 0 && $$bindings.leftOffset && leftOffset !== void 0)
    $$bindings.leftOffset(leftOffset);
  if ($$props.rightOffset === void 0 && $$bindings.rightOffset && rightOffset !== void 0)
    $$bindings.rightOffset(rightOffset);
  if ($$props.topOffset === void 0 && $$bindings.topOffset && topOffset !== void 0)
    $$bindings.topOffset(topOffset);
  if ($$props.bottomOffset === void 0 && $$bindings.bottomOffset && bottomOffset !== void 0)
    $$bindings.bottomOffset(bottomOffset);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.backdrop === void 0 && $$bindings.backdrop && backdrop2 !== void 0)
    $$bindings.backdrop(backdrop2);
  if ($$props.bgColor === void 0 && $$bindings.bgColor && bgColor !== void 0)
    $$bindings.bgColor(bgColor);
  if ($$props.bgOpacity === void 0 && $$bindings.bgOpacity && bgOpacity !== void 0)
    $$bindings.bgOpacity(bgOpacity);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0)
    $$bindings.placement(placement);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.divClass === void 0 && $$bindings.divClass && divClass !== void 0)
    $$bindings.divClass(divClass);
  if ($$props.transitionParams === void 0 && $$bindings.transitionParams && transitionParams !== void 0)
    $$bindings.transitionParams(transitionParams);
  if ($$props.transitionType === void 0 && $$bindings.transitionType && transitionType !== void 0)
    $$bindings.transitionType(transitionType);
  return `${!hidden ? `${backdrop2 && activateClickOutside ? `<div role="presentation"${add_attribute("class", backdropDivClass, 0)}></div>` : `${backdrop2 && !activateClickOutside ? `<div role="presentation"${add_attribute("class", backdropDivClass, 0)}></div>` : ``}`}
  ${activateClickOutside ? `<div${spread(
    [
      { id: escape_attribute_value(id) },
      escape_object($$restProps),
      {
        class: escape_attribute_value(classNames(divClass, width, position, placements[placement], $$props.class))
      },
      { tabindex: "-1" },
      {
        "aria-controls": escape_attribute_value(id)
      },
      {
        "aria-labelledby": escape_attribute_value(id)
      }
    ],
    {}
  )}>${slots.default ? slots.default({ hidden }) : ``}</div>` : `<div${spread(
    [
      { id: escape_attribute_value(id) },
      escape_object($$restProps),
      {
        class: escape_attribute_value(classNames(divClass, width, position, placements[placement], $$props.class))
      },
      { tabindex: "-1" },
      {
        "aria-controls": escape_attribute_value(id)
      },
      {
        "aria-labelledby": escape_attribute_value(id)
      }
    ],
    {}
  )}>${slots.default ? slots.default({ hidden }) : ``}</div>`}` : ``}`;
});
const Navbar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["navClass", "navDivClass", "fluid", "color"]);
  let { navClass = "px-2 sm:px-4 py-2.5 w-full" } = $$props;
  let { navDivClass = "mx-auto flex flex-wrap justify-between items-center " } = $$props;
  let { fluid = false } = $$props;
  let { color = "navbar" } = $$props;
  let hidden = true;
  let toggle = () => {
    hidden = !hidden;
  };
  if ($$props.navClass === void 0 && $$bindings.navClass && navClass !== void 0)
    $$bindings.navClass(navClass);
  if ($$props.navDivClass === void 0 && $$bindings.navDivClass && navDivClass !== void 0)
    $$bindings.navDivClass(navDivClass);
  if ($$props.fluid === void 0 && $$bindings.fluid && fluid !== void 0)
    $$bindings.fluid(fluid);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  return `${validate_component(Frame, "Frame").$$render(
    $$result,
    Object.assign({}, { tag: "nav" }, { color }, $$restProps, {
      class: classNames(navClass, $$props.class)
    }),
    {},
    {
      default: () => {
        return `<div${add_attribute("class", classNames(navDivClass, fluid && "w-full" || "container"), 0)}>${slots.default ? slots.default({ hidden, toggle }) : ``}</div>`;
      }
    }
  )}`;
});
const NavBrand = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["href"]);
  let { href = "" } = $$props;
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  return `<a${spread(
    [
      { href: escape_attribute_value(href) },
      escape_object($$restProps),
      {
        class: escape_attribute_value(classNames("flex items-center", $$props.class))
      }
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</a>`;
});
const Menu = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["size", "color", "variation", "ariaLabel"]);
  let { size = "24" } = $$props;
  let { color = "currentColor" } = $$props;
  let { variation = "outline" } = $$props;
  let { ariaLabel = "bars 3" } = $$props;
  let viewBox;
  let svgpath;
  let svgoutline = `<path stroke="${color}" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path> `;
  let svgsolid = `<path fill="${color}" clip-rule="evenodd" fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"></path> `;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.variation === void 0 && $$bindings.variation && variation !== void 0)
    $$bindings.variation(variation);
  if ($$props.ariaLabel === void 0 && $$bindings.ariaLabel && ariaLabel !== void 0)
    $$bindings.ariaLabel(ariaLabel);
  {
    switch (variation) {
      case "outline":
        svgpath = svgoutline;
        viewBox = "0 0 24 24";
        break;
      case "solid":
        svgpath = svgsolid;
        viewBox = "0 0 24 24";
        break;
      default:
        svgpath = svgoutline;
        viewBox = "0 0 24 24";
    }
  }
  return `<svg${spread(
    [
      { xmlns: "http://www.w3.org/2000/svg" },
      { width: escape_attribute_value(size) },
      { height: escape_attribute_value(size) },
      {
        class: escape_attribute_value($$props.class)
      },
      escape_object($$restProps),
      {
        "aria-label": escape_attribute_value(ariaLabel)
      },
      { fill: "none" },
      { viewBox: escape_attribute_value(viewBox) },
      { "stroke-width": "2" }
    ],
    {}
  )}><!-- HTML_TAG_START -->${svgpath}<!-- HTML_TAG_END --></svg>`;
});
const NavHamburger = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["btnClass"]);
  let { btnClass = "ml-3 md:hidden" } = $$props;
  if ($$props.btnClass === void 0 && $$bindings.btnClass && btnClass !== void 0)
    $$bindings.btnClass(btnClass);
  return `${validate_component(ToolbarButton, "ToolbarButton").$$render(
    $$result,
    Object.assign({}, { name: "Open main menu" }, $$restProps, {
      class: classNames(btnClass, $$props.class)
    }),
    {},
    {
      default: () => {
        return `${validate_component(Menu, "Menu").$$render($$result, { class: "h-6 w-6 shrink-0" }, {}, {})}`;
      }
    }
  )}`;
});
const NavLi = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["href", "active", "activeClass", "nonActiveClass"]);
  let { href = "" } = $$props;
  let { active = false } = $$props;
  let { activeClass = void 0 } = $$props;
  let { nonActiveClass = void 0 } = $$props;
  const context = getContext("navbar") ?? {};
  let liClass;
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.active === void 0 && $$bindings.active && active !== void 0)
    $$bindings.active(active);
  if ($$props.activeClass === void 0 && $$bindings.activeClass && activeClass !== void 0)
    $$bindings.activeClass(activeClass);
  if ($$props.nonActiveClass === void 0 && $$bindings.nonActiveClass && nonActiveClass !== void 0)
    $$bindings.nonActiveClass(nonActiveClass);
  liClass = classNames(
    "block py-2 pr-4 pl-3 md:p-0 rounded md:border-0",
    active ? activeClass ?? context.activeClass : nonActiveClass ?? context.nonActiveClass,
    $$props.class
  );
  return `<li>${((tag) => {
    return tag ? `<${href ? "a" : "div"}${spread(
      [
        { href: escape_attribute_value(href) },
        escape_object($$restProps),
        { class: escape_attribute_value(liClass) }
      ],
      {}
    )}>${is_void(tag) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag) ? "" : `</${tag}>`}` : "";
  })(href ? "a" : "div")}</li>`;
});
const NavUl = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["divClass", "ulClass", "hidden", "slideParams", "activeClass", "nonActiveClass"]);
  let { divClass = "w-full md:block md:w-auto" } = $$props;
  let { ulClass = "flex flex-col p-4 mt-4 md:flex-row md:space-x-8 md:mt-0 md:text-sm md:font-medium" } = $$props;
  let { hidden = true } = $$props;
  let { slideParams = {
    delay: 250,
    duration: 500,
    easing: quintOut
  } } = $$props;
  let { activeClass = "text-white bg-blue-700 md:bg-transparent md:text-blue-700 md:dark:text-white dark:bg-blue-600 md:dark:bg-transparent" } = $$props;
  let { nonActiveClass = "text-gray-700 hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent" } = $$props;
  setContext("navbar", { activeClass, nonActiveClass });
  let _divClass;
  let _ulClass;
  if ($$props.divClass === void 0 && $$bindings.divClass && divClass !== void 0)
    $$bindings.divClass(divClass);
  if ($$props.ulClass === void 0 && $$bindings.ulClass && ulClass !== void 0)
    $$bindings.ulClass(ulClass);
  if ($$props.hidden === void 0 && $$bindings.hidden && hidden !== void 0)
    $$bindings.hidden(hidden);
  if ($$props.slideParams === void 0 && $$bindings.slideParams && slideParams !== void 0)
    $$bindings.slideParams(slideParams);
  if ($$props.activeClass === void 0 && $$bindings.activeClass && activeClass !== void 0)
    $$bindings.activeClass(activeClass);
  if ($$props.nonActiveClass === void 0 && $$bindings.nonActiveClass && nonActiveClass !== void 0)
    $$bindings.nonActiveClass(nonActiveClass);
  _divClass = classNames(divClass, $$props.class);
  _ulClass = classNames(
    ulClass,
    // 'divide-y md:divide-y-0 divide-gray-100 dark:divide-gray-700',
    $$props.class
  );
  return `${!hidden ? `<div${spread([escape_object($$restProps), { class: escape_attribute_value(_divClass) }], {})}>${validate_component(Frame, "Frame").$$render(
    $$result,
    {
      tag: "ul",
      border: true,
      rounded: true,
      color: "navbarUl",
      class: _ulClass
    },
    {},
    {
      default: () => {
        return `${slots.default ? slots.default({}) : ``}`;
      }
    }
  )}</div>` : `<div${spread(
    [
      escape_object($$restProps),
      { class: escape_attribute_value(_divClass) },
      { hidden: hidden || null }
    ],
    {}
  )}><ul${add_attribute("class", _ulClass, 0)}>${slots.default ? slots.default({}) : ``}</ul></div>`}`;
});
const Sidebar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["asideClass"]);
  let { asideClass = "w-64" } = $$props;
  if ($$props.asideClass === void 0 && $$bindings.asideClass && asideClass !== void 0)
    $$bindings.asideClass(asideClass);
  return `<aside${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(classNames(asideClass, $$props.class))
      },
      { "aria-label": "Sidebar" }
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</aside>`;
});
const SidebarItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["aClass", "href", "label", "spanClass", "activeClass", "active"]);
  let $$slots = compute_slots(slots);
  let { aClass = "flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" } = $$props;
  let { href = "" } = $$props;
  let { label = "" } = $$props;
  let { spanClass: spanClass2 = "ml-3" } = $$props;
  let { activeClass = "flex items-center p-2 text-base font-normal text-gray-900 bg-gray-200 dark:bg-gray-700 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" } = $$props;
  let { active = false } = $$props;
  if ($$props.aClass === void 0 && $$bindings.aClass && aClass !== void 0)
    $$bindings.aClass(aClass);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.spanClass === void 0 && $$bindings.spanClass && spanClass2 !== void 0)
    $$bindings.spanClass(spanClass2);
  if ($$props.activeClass === void 0 && $$bindings.activeClass && activeClass !== void 0)
    $$bindings.activeClass(activeClass);
  if ($$props.active === void 0 && $$bindings.active && active !== void 0)
    $$bindings.active(active);
  return `<li><a${spread(
    [
      escape_object($$restProps),
      { href: escape_attribute_value(href) },
      {
        class: escape_attribute_value(classNames(active ? activeClass : aClass, $$props.class))
      }
    ],
    {}
  )}>${slots.icon ? slots.icon({}) : ``}
    <span${add_attribute("class", spanClass2, 0)}>${escape(label)}</span>
    ${$$slots.subtext ? `${slots.subtext ? slots.subtext({}) : ``}` : ``}</a></li>`;
});
const SidebarDropdownWrapper = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "btnClass",
    "label",
    "spanClass",
    "ulClass",
    "transitionType",
    "transitionParams",
    "isOpen"
  ]);
  let $$slots = compute_slots(slots);
  let { btnClass = "flex items-center p-2 w-full text-base font-normal text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700" } = $$props;
  let { label = "" } = $$props;
  let { spanClass: spanClass2 = "flex-1 ml-3 text-left whitespace-nowrap" } = $$props;
  let { ulClass = "py-2 space-y-2" } = $$props;
  let { transitionType = "slide" } = $$props;
  let { transitionParams = {} } = $$props;
  let { isOpen = false } = $$props;
  if ($$props.btnClass === void 0 && $$bindings.btnClass && btnClass !== void 0)
    $$bindings.btnClass(btnClass);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.spanClass === void 0 && $$bindings.spanClass && spanClass2 !== void 0)
    $$bindings.spanClass(spanClass2);
  if ($$props.ulClass === void 0 && $$bindings.ulClass && ulClass !== void 0)
    $$bindings.ulClass(ulClass);
  if ($$props.transitionType === void 0 && $$bindings.transitionType && transitionType !== void 0)
    $$bindings.transitionType(transitionType);
  if ($$props.transitionParams === void 0 && $$bindings.transitionParams && transitionParams !== void 0)
    $$bindings.transitionParams(transitionParams);
  if ($$props.isOpen === void 0 && $$bindings.isOpen && isOpen !== void 0)
    $$bindings.isOpen(isOpen);
  return `<li><button${spread(
    [
      escape_object($$restProps),
      { type: "button" },
      {
        class: escape_attribute_value(classNames(btnClass, $$props.class))
      },
      { "aria-controls": "sidebar-dropdown" }
    ],
    {}
  )}>${slots.icon ? slots.icon({}) : ``}
    <span${add_attribute("class", spanClass2, 0)}>${escape(label)}</span>
    ${isOpen ? `${$$slots.arrowup ? `${slots.arrowup ? slots.arrowup({}) : ``}` : `${validate_component(ChevronUp, "ChevronUp").$$render($$result, {}, {}, {})}`}` : `${$$slots.arrowdown ? `${slots.arrowdown ? slots.arrowdown({}) : ``}` : `${validate_component(ChevronDown, "ChevronDown").$$render($$result, {}, {}, {})}`}`}</button>
  ${isOpen ? `<ul${add_attribute("class", ulClass, 0)}>${slots.default ? slots.default({}) : ``}</ul>` : ``}</li>`;
});
const SidebarGroup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["ulClass", "borderClass", "border"]);
  let { ulClass = "space-y-2" } = $$props;
  let { borderClass = "pt-4 mt-4 border-t border-gray-200 dark:border-gray-700" } = $$props;
  let { border = false } = $$props;
  if (border) {
    ulClass += " " + borderClass;
  }
  if ($$props.ulClass === void 0 && $$bindings.ulClass && ulClass !== void 0)
    $$bindings.ulClass(ulClass);
  if ($$props.borderClass === void 0 && $$bindings.borderClass && borderClass !== void 0)
    $$bindings.borderClass(borderClass);
  if ($$props.border === void 0 && $$bindings.border && border !== void 0)
    $$bindings.border(border);
  return `<ul${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(classNames(ulClass, $$props.class))
      }
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</ul>`;
});
const SidebarWrapper = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["divClass"]);
  let { divClass = "overflow-y-auto py-4 px-3 bg-gray-50 rounded dark:bg-gray-800" } = $$props;
  if ($$props.divClass === void 0 && $$bindings.divClass && divClass !== void 0)
    $$bindings.divClass(divClass);
  return `<div${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(classNames(divClass, $$props.class))
      }
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</div>`;
});
const UserIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $sessionAuth, $$unsubscribe_sessionAuth;
  $$unsubscribe_sessionAuth = subscribe(sessionAuth, (value) => $sessionAuth = value);
  $$unsubscribe_sessionAuth();
  return `<div>${$sessionAuth?.photoURL ? `<img class="rounded-[50%] w-10" alt="profilePicture"${add_attribute("src", $sessionAuth?.photoURL, 0)}>` : `<div class="text-xs">${escape($sessionAuth?.displayName || "loading...")}</div>`}</div>`;
});
const css$1 = {
  code: "input.svelte-19zjzi3:checked+.slider.svelte-19zjzi3{background-color:#2196f3}input.svelte-19zjzi3:focus+.slider.svelte-19zjzi3{box-shadow:0 0 1px #2196f3}input.svelte-19zjzi3:checked+.slider.svelte-19zjzi3:before{-webkit-transform:translateX(24px);-ms-transform:translateX(24px);transform:translateX(24px)}",
  map: null
};
const switchStyle = "relative inline-block w-14 h-8";
const Toggle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const dispatch = createEventDispatcher();
  let { checked = false } = $$props;
  const sliderStyle = `
        absolute 
        cursor-pointer 
        top-0 
        left-0 
        right-0 
        bottom-0 
        bg-gray-300 
        transition 
        duration-300 
        rounded-2xl 
    `;
  const sliderBeforeStyle = `
        before:absolute 
        before:content-[""] 
        before:h-6 
        before:w-6 
        before:left-1 
        before:bottom-1 
        before:bg-white 
        before:transition 
        before:duration-300 
        before:rounded-full 
    `;
  if ($$props.checked === void 0 && $$bindings.checked && checked !== void 0)
    $$bindings.checked(checked);
  $$result.css.add(css$1);
  {
    dispatch("change", { checked });
  }
  return `<label${add_attribute("class", switchStyle, 0)}><input class="opacity-0 w-0 h-0 svelte-19zjzi3" type="checkbox"${add_attribute("checked", checked, 1)}>
	<span class="${"slider " + escape(sliderStyle, true) + " " + escape(sliderBeforeStyle, true) + " svelte-19zjzi3"}"></span>
</label>`;
});
const schedulerDoc = "https://docs.google.com/document/d/1FQ828hDuuPRnQ7QWYMykSv9bT3Lmxi0amLsFyTjnyuM/edit?usp=share_link";
let backdrop = false;
let breakPoint = 1024;
let spanClass = "pl-8 self-center text-md text-gray-900 whitespace-nowrap dark:text-white";
const Sidebar_1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let activateClickOutside;
  let activeUrl;
  let $viewMode, $$unsubscribe_viewMode;
  let $page, $$unsubscribe_page;
  let $loginState, $$unsubscribe_loginState;
  let $user, $$unsubscribe_user;
  let $view, $$unsubscribe_view;
  $$unsubscribe_viewMode = subscribe(viewMode, (value) => $viewMode = value);
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_loginState = subscribe(loginState, (value) => $loginState = value);
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  $$unsubscribe_view = subscribe(view, (value) => $view = value);
  let { day = "" } = $$props;
  let drawerHidden = true;
  let width;
  let transitionParams = { x: -320, duration: 200, easing: sineIn };
  if ($$props.day === void 0 && $$bindings.day && day !== void 0)
    $$bindings.day(day);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    drawerHidden = $loginState !== "in" || width < breakPoint;
    activateClickOutside = !drawerHidden && width < breakPoint;
    activeUrl = $page.url.pathname;
    $$rendered = `

${validate_component(Navbar, "Navbar").$$render($$result, { color: "currentColor" }, {}, {
      default: ({ hidden, toggle }) => {
        return `${validate_component(NavHamburger, "NavHamburger").$$render(
          $$result,
          {
            btnClass: "ml-3 " + ($loginState !== "in" ? "hidden" : "") + " lg:hidden"
          },
          {},
          {}
        )}
	${validate_component(NavBrand, "NavBrand").$$render($$result, { href: "/", class: "lg:ml-64" }, {}, {
          default: () => {
            return `<span class="self-center whitespace-nowrap xs:text-xl font-semibold dark:text-white">SuperHOME Scheduler
		</span>`;
          }
        })}
	${$user && $loginState === "in" ? `${validate_component(NavUl, "NavUl").$$render(
          $$result,
          {
            divClass: "block md:w-auto",
            ulClass: "flex flex-col p-0 mt-0 md:flex-row md:space-x-8 md:text-sm md:font-medium",
            hidden
          },
          {},
          {
            default: () => {
              return `${validate_component(NavLi, "NavLi").$$render($$result, {}, {}, {
                default: () => {
                  return `${validate_component(Modal, "Modal").$$render($$result, { closeButton: false }, {}, {
                    default: () => {
                      return `${validate_component(UserIcon, "UserIcon").$$render($$result, {}, {}, {})}`;
                    }
                  })}`;
                }
              })}`;
            }
          }
        )}` : ``}`;
      }
    })}

${validate_component(Drawer, "Drawer").$$render(
      $$result,
      {
        transitionType: "fly",
        backdrop,
        transitionParams,
        width: "w-64",
        id: "sidebar",
        divClass: "overflow-y-auto z-50 p-4 bg-white dark:bg-[#252515]",
        hidden: drawerHidden,
        activateClickOutside
      },
      {
        hidden: ($$value) => {
          drawerHidden = $$value;
          $$settled = false;
        },
        activateClickOutside: ($$value) => {
          activateClickOutside = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `<div class="flex items-center">${validate_component(CloseButton, "CloseButton").$$render($$result, { class: "mb-4 dark:text-white lg:hidden" }, {}, {})}</div>
	${validate_component(Sidebar, "Sidebar").$$render($$result, { asideClass: "w-54" }, {}, {
            default: () => {
              return `${validate_component(SidebarWrapper, "SidebarWrapper").$$render(
                $$result,
                {
                  divClass: "overflow-y-auto py-4 px-3 rounded"
                },
                {},
                {
                  default: () => {
                    return `${validate_component(SidebarGroup, "SidebarGroup").$$render($$result, {}, {}, {
                      default: () => {
                        return `${$loginState === "in" ? `${validate_component(SidebarItem, "SidebarItem").$$render($$result, { label: "Logout" }, {}, {})}` : ``}
				${$user && $user.privileges === "admin" ? `<div class="ms-4">${validate_component(Toggle, "Toggle").$$render($$result, { checked: $viewMode === "admin" }, {}, {})}
						<span>Admin Mode</span></div>
					${$viewMode === "admin" ? `${validate_component(SidebarDropdownWrapper, "SidebarDropdownWrapper").$$render($$result, { label: "Download DBs" }, {}, {
                          default: () => {
                            return `${validate_component(SidebarItem, "SidebarItem").$$render($$result, { label: "Reservations", spanClass }, {}, {})}
							${validate_component(SidebarItem, "SidebarItem").$$render($$result, { label: "main", spanClass }, {}, {})}
							${validate_component(SidebarItem, "SidebarItem").$$render($$result, { label: "backup-day-1", spanClass }, {}, {})}
							${validate_component(SidebarItem, "SidebarItem").$$render($$result, { label: "backup-day-2", spanClass }, {}, {})}`;
                          }
                        })}` : ``}` : ``}
				${validate_component(SidebarItem, "SidebarItem").$$render(
                          $$result,
                          {
                            label: "My Reservations",
                            href: "/",
                            active: activeUrl === `/`
                          },
                          {},
                          {}
                        )}
				${validate_component(SidebarDropdownWrapper, "SidebarDropdownWrapper").$$render($$result, { isOpen: true, label: "Calendars" }, {}, {
                          default: () => {
                            return `${validate_component(SidebarItem, "SidebarItem").$$render(
                              $$result,
                              {
                                label: "Pool",
                                href: "/" + $view + "/pool/" + day,
                                spanClass,
                                active: activeUrl === "/" + $view + "/pool"
                              },
                              {},
                              {}
                            )}
					${validate_component(SidebarItem, "SidebarItem").$$render(
                              $$result,
                              {
                                label: "Open Water",
                                href: "/" + $view + "/openwater/" + day,
                                spanClass,
                                active: activeUrl === "/" + $view + "/openwater"
                              },
                              {},
                              {}
                            )}${validate_component(SidebarItem, "SidebarItem").$$render(
                              $$result,
                              {
                                label: "Classroom",
                                href: "/" + $view + "/classroom/" + day,
                                spanClass,
                                active: activeUrl === "/" + $view + "/classroom"
                              },
                              {},
                              {}
                            )}`;
                          }
                        })}
				${validate_component(SidebarItem, "SidebarItem").$$render(
                          $$result,
                          {
                            label: "How to use this app",
                            target: "_blank",
                            href: schedulerDoc
                          },
                          {},
                          {}
                        )}
				${validate_component(SidebarItem, "SidebarItem").$$render(
                          $$result,
                          {
                            label: "Facilities Guide",
                            target: "_blank",
                            href: "https://www.freedivesuperhome.com/facility-guideline"
                          },
                          {},
                          {}
                        )}
				${validate_component(SidebarItem, "SidebarItem").$$render(
                          $$result,
                          {
                            label: "Messenger Group",
                            target: "_blank",
                            href: "https://m.me/j/Abaj0BzT0Q8K85gO/"
                          },
                          {},
                          {}
                        )}
				${!isGoogleLinked() && $user?.id && auth?.currentUser?.providerData[0].providerId === "facebook.com" ? `${validate_component(SidebarItem, "SidebarItem").$$render($$result, { label: "Link Google Account" }, {}, {})}` : ``}
				${validate_component(SidebarItem, "SidebarItem").$$render(
                          $$result,
                          {
                            label: "Privacy Policy",
                            target: "_blank",
                            href: "https://app.freedivesuperhome.com/privacy"
                          },
                          {},
                          {}
                        )}`;
                      }
                    })}`;
                  }
                }
              )}`;
            }
          })}`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_viewMode();
  $$unsubscribe_page();
  $$unsubscribe_loginState();
  $$unsubscribe_user();
  $$unsubscribe_view();
  return $$rendered;
});
function is_date(obj) {
  return Object.prototype.toString.call(obj) === "[object Date]";
}
function get_interpolator(a, b) {
  if (a === b || a !== a)
    return () => a;
  const type = typeof a;
  if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    throw new Error("Cannot interpolate values of different type");
  }
  if (Array.isArray(a)) {
    const arr = b.map((bi, i) => {
      return get_interpolator(a[i], bi);
    });
    return (t) => arr.map((fn) => fn(t));
  }
  if (type === "object") {
    if (!a || !b)
      throw new Error("Object cannot be null");
    if (is_date(a) && is_date(b)) {
      a = a.getTime();
      b = b.getTime();
      const delta = b - a;
      return (t) => new Date(a + t * delta);
    }
    const keys = Object.keys(b);
    const interpolators = {};
    keys.forEach((key) => {
      interpolators[key] = get_interpolator(a[key], b[key]);
    });
    return (t) => {
      const result = {};
      keys.forEach((key) => {
        result[key] = interpolators[key](t);
      });
      return result;
    };
  }
  if (type === "number") {
    const delta = b - a;
    return (t) => a + t * delta;
  }
  throw new Error(`Cannot interpolate ${type} values`);
}
function tweened(value, defaults = {}) {
  const store = writable(value);
  let task;
  let target_value = value;
  function set(new_value, opts) {
    if (value == null) {
      store.set(value = new_value);
      return Promise.resolve();
    }
    target_value = new_value;
    let previous_task = task;
    let started = false;
    let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
    if (duration === 0) {
      if (previous_task) {
        previous_task.abort();
        previous_task = null;
      }
      store.set(value = target_value);
      return Promise.resolve();
    }
    const start = now() + delay;
    let fn;
    task = loop((now2) => {
      if (now2 < start)
        return true;
      if (!started) {
        fn = interpolate(value, new_value);
        if (typeof duration === "function")
          duration = duration(value, new_value);
        started = true;
      }
      if (previous_task) {
        previous_task.abort();
        previous_task = null;
      }
      const elapsed = now2 - start;
      if (elapsed > duration) {
        store.set(value = new_value);
        return false;
      }
      store.set(value = fn(easing(elapsed / duration)));
      return true;
    });
    return task.promise;
  }
  return {
    set,
    update: (fn, opts) => set(fn(target_value, value), opts),
    subscribe: store.subscribe
  };
}
const css = {
  code: "progress.svelte-14a1rr3{--bar-color:rgba(255, 255, 255, 0.3);--val-color:skyblue;position:fixed;top:0;z-index:99999;left:0;height:4px;width:100vw;border-radius:0}progress.svelte-14a1rr3::-webkit-progress-bar{background-color:var(--bar-color);width:100%}progress.svelte-14a1rr3{background-color:var(--bar-color)}progress.svelte-14a1rr3::-webkit-progress-value{background-color:var(--val-color) !important}progress.svelte-14a1rr3::-moz-progress-bar{background-color:var(--val-color) !important}progress.svelte-14a1rr3{color:var(--val-color)}",
  map: null
};
const Nprogress = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $navigating, $$unsubscribe_navigating;
  let $p, $$unsubscribe_p;
  $$unsubscribe_navigating = subscribe(navigating, (value) => $navigating = value);
  const p = tweened(0, { duration: 200, easing: cubicOut });
  $$unsubscribe_p = subscribe(p, (value) => $p = value);
  let isVisible = false;
  function increase() {
    if ($p >= 0 && $p < 0.2) {
      p.update((_) => _ + 0.04);
    } else if ($p >= 0.2 && $p < 0.5) {
      p.update((_) => _ + 0.02);
    } else if ($p >= 0.5 && $p < 0.8) {
      p.update((_) => _ + 2e-3);
    } else if ($p >= 0.8 && $p < 0.99) {
      p.update((_) => _ + 5e-4);
    } else {
      p.set(0);
    }
    if ($navigating) {
      const rand = Math.round(Math.random() * (300 - 50)) + 50;
      setTimeout(
        function() {
          increase();
        },
        rand
      );
    }
  }
  $$result.css.add(css);
  {
    {
      if ($navigating) {
        increase();
        isVisible = true;
      }
      if (!$navigating) {
        p.update((_) => _ + 0.3);
        setTimeout(
          function() {
            p.set(1);
            setTimeout(
              function() {
                isVisible = false;
                p.set(0);
              },
              100
            );
          },
          100
        );
      }
    }
  }
  $$unsubscribe_navigating();
  $$unsubscribe_p();
  return `<progress${add_attribute("value", 50, 0)} class="${["animate-pulse svelte-14a1rr3", ""].join(" ").trim()}"></progress>
${$p > 0 && $p < 1 && isVisible ? `<progress${add_attribute("value", $p, 0)} class="svelte-14a1rr3"></progress>` : ``}`;
});
const Popup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `

<div id="alertMsg" class="absolute z-[9999] w-fit top-1/2 p-2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-black text-red-500 text-center border border-black rounded-lg ring ring-red-500 invisible opacity-0 transition-opacity duration-500 target:visible target:opacity-100">${validate_component(ExclamationCircle, "ExclamationCircle").$$render($$result, {}, {}, {})}<span id="alertText" class="ms-2"></span></div>`;
});
const NotificationPopup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $user, $$unsubscribe_user;
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  let { ntf } = $$props;
  getContext("simple-modal");
  if ($$props.ntf === void 0 && $$bindings.ntf && ntf !== void 0)
    $$bindings.ntf(ntf);
  $$unsubscribe_user();
  return `${$user && ntf ? `<span class="table text-left mx-auto mb-4 dark:text-white">${each(ntf.message.split("\n"), (msg) => {
    return `<p>${escape(msg)}</p>`;
  })}</span>
	<form method="POST" action="/?/submitReceipt"><input type="hidden" name="notificationId"${add_attribute("value", ntf.id, 0)}>
		<input type="hidden" name="userId"${add_attribute("value", $user.id, 0)}>
		<div class="flex mb-2 justify-between"><div class="mx-4"><input id="ntfAccept" type="checkbox" name="accept">
				<label for="ntfAccept" class="dark:text-white">${escape(ntf.checkboxMessage)}</label></div>
			<button type="submit" class="me-4 bg-gray-100 disabled:text-gray-400 px-3 py-1">OK</button></div></form>` : ``}`;
});
const Notification = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $notifications, $$unsubscribe_notifications;
  $$unsubscribe_notifications = subscribe(notifications, (value) => $notifications = value);
  const { open } = getContext("simple-modal");
  const showNotification = (ntf) => {
    open(NotificationPopup, { ntf }, {}, {
      onClosed: () => checkForNotifications($notifications)
    });
  };
  function checkForNotifications(ntfs) {
    if (ntfs.length > 0) {
      showNotification(ntfs.pop());
    }
  }
  {
    checkForNotifications($notifications.reverse());
  }
  $$unsubscribe_notifications();
  return ``;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  let $$unsubscribe_loginState;
  let $$unsubscribe_user;
  let $$unsubscribe_sessionAuth;
  let $$unsubscribe_stateLoaded;
  let $$unsubscribe_profileSrc;
  let $$unsubscribe_users;
  let $$unsubscribe_viewMode;
  let $$unsubscribe_notifications;
  let $settings, $$unsubscribe_settings;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_loginState = subscribe(loginState, (value) => value);
  $$unsubscribe_user = subscribe(user, (value) => value);
  $$unsubscribe_sessionAuth = subscribe(sessionAuth, (value) => value);
  $$unsubscribe_stateLoaded = subscribe(stateLoaded, (value) => value);
  $$unsubscribe_profileSrc = subscribe(profileSrc, (value) => value);
  $$unsubscribe_users = subscribe(users, (value) => value);
  $$unsubscribe_viewMode = subscribe(viewMode, (value) => value);
  $$unsubscribe_notifications = subscribe(notifications, (value) => value);
  $$unsubscribe_settings = subscribe(settings, (value) => $settings = value);
  let { data } = $$props;
  set_store_value(settings, $settings = data.settings, $settings);
  const publicRoutes = ["/privacy"];
  if ($page.route.id && !publicRoutes.includes($page.route.id))
    ;
  console.log("layout", $page.route.id, $page.params["day"]);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  $$unsubscribe_page();
  $$unsubscribe_loginState();
  $$unsubscribe_user();
  $$unsubscribe_sessionAuth();
  $$unsubscribe_stateLoaded();
  $$unsubscribe_profileSrc();
  $$unsubscribe_users();
  $$unsubscribe_viewMode();
  $$unsubscribe_notifications();
  $$unsubscribe_settings();
  return `${$page.route.id && !publicRoutes.includes($page.route.id) ? `${validate_component(Nprogress, "Nprogress").$$render($$result, {}, {}, {})}
	${validate_component(Sidebar_1, "Sidebar").$$render($$result, { day: $page.params["day"] || "" }, {}, {})}

	${``}

	${validate_component(Toaster, "Toaster").$$render($$result, {}, {}, {})}

	${validate_component(Popup, "Popup").$$render($$result, {}, {}, {})}

	${validate_component(Modal, "Modal").$$render(
    $$result,
    {
      closeOnEsc: false,
      closeOnOuterClick: false,
      closeButton: false,
      styleWindow: {
        width: "fit-content",
        "min-width": "300px"
      }
    },
    {},
    {
      default: () => {
        return `${validate_component(Notification, "Notification").$$render($$result, {}, {}, {})}`;
      }
    }
  )}` : `${slots.default ? slots.default({}) : ``}`}`;
});

export { Layout as default };
//# sourceMappingURL=_layout.svelte-04dcc8e2.js.map
