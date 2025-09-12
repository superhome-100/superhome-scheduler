import dayjs from 'dayjs';
import { c as create_ssr_component, e as escape } from './index3-9a6d7026.js';

const getCategoryDatePath = (category, date) => {
  if (!["classroom", "pool", "openwater"].includes(category))
    return "/";
  const yyyyMMDD = date ? dayjs(date).format("YYYY-MM-DD") : "";
  if (date && yyyyMMDD && yyyyMMDD.split("-").length === 3) {
    return `/single-day/${category}/${yyyyMMDD}`;
  } else {
    return `/multi-day/${category}`;
  }
};
const Chevron = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { direction } = $$props;
  let { svgClass = "" } = $$props;
  if ($$props.direction === void 0 && $$bindings.direction && direction !== void 0)
    $$bindings.direction(direction);
  if ($$props.svgClass === void 0 && $$bindings.svgClass && svgClass !== void 0)
    $$bindings.svgClass(svgClass);
  return `${direction === "left" ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${"h-6 w-6 " + escape(svgClass, true)}"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"></path></svg>` : `${direction === "right" ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${"h-6 w-6 " + escape(svgClass, true)}"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path></svg>` : ``}`}`;
});
const css = {
  code: ".progress.svelte-16f277p{animation:svelte-16f277p-progress 1s infinite linear}.left-right.svelte-16f277p{transform-origin:0% 50%}@keyframes svelte-16f277p-progress{0%{transform:translateX(0) scaleX(0)}40%{transform:translateX(0) scaleX(0.4)}100%{transform:translateX(100%) scaleX(0.5)}}",
  map: null
};
const LoadingBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `<div class="w-full"><div class="h-1.5 w-full bg-pink-100 overflow-hidden"><div class="progress w-full h-full bg-pink-500 left-right svelte-16f277p"></div></div>
</div>`;
});

export { Chevron as C, LoadingBar as L, getCategoryDatePath as g };
//# sourceMappingURL=LoadingBar-2b85ed2c.js.map
