import { c as create_ssr_component, b as subscribe, s as setContext, o as onDestroy, d as set_store_value, j as getContext, e as escape } from './index3-9a6d7026.js';
import 'svelte-gestures';
import { w as writable } from './index2-be97e17a.js';

const TABS = {};
const Tabs = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $selectedPanel, $$unsubscribe_selectedPanel;
  let $selectedTab, $$unsubscribe_selectedTab;
  let { tabIndex = 0 } = $$props;
  let { disableNav = false } = $$props;
  const tabs = [];
  const panels = [];
  const selectedTab = writable(null);
  $$unsubscribe_selectedTab = subscribe(selectedTab, (value) => $selectedTab = value);
  const selectedPanel = writable(null);
  $$unsubscribe_selectedPanel = subscribe(selectedPanel, (value) => $selectedPanel = value);
  setContext(TABS, {
    registerTab: (tab) => {
      tabs.push(tab);
      selectedTab.update((current) => current || tab);
      onDestroy(() => {
        const i = tabs.indexOf(tab);
        tabs.splice(i, 1);
        selectedTab.update((current) => current === tab ? tabs[i] || tabs[tabs.length - 1] : current);
      });
    },
    registerPanel: (panel) => {
      panels.push(panel);
      selectedPanel.update((current) => current || panel);
      onDestroy(() => {
        const i = panels.indexOf(panel);
        panels.splice(i, 1);
        selectedPanel.update((current) => current === panel ? panels[i] || panels[panels.length - 1] : current);
      });
    },
    selectTab: (tab) => {
      if (!disableNav) {
        const i = tabs.indexOf(tab);
        selectedTab.set(tab);
        selectedPanel.set(panels[i]);
      }
    },
    selectedTab,
    selectedPanel
  });
  if ($$props.tabIndex === void 0 && $$bindings.tabIndex && tabIndex !== void 0)
    $$bindings.tabIndex(tabIndex);
  if ($$props.disableNav === void 0 && $$bindings.disableNav && disableNav !== void 0)
    $$bindings.disableNav(disableNav);
  {
    {
      set_store_value(selectedTab, $selectedTab = tabs[tabIndex], $selectedTab);
      set_store_value(selectedPanel, $selectedPanel = panels[tabIndex], $selectedPanel);
    }
  }
  $$unsubscribe_selectedPanel();
  $$unsubscribe_selectedTab();
  return `

<div class="text-center min-h-[500px]">${slots.default ? slots.default({}) : ``}</div>`;
});
const TabList = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="p-2">${slots.default ? slots.default({}) : ``}</div>`;
});
const TabPanel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $selectedPanel, $$unsubscribe_selectedPanel;
  const panel = {};
  const { registerPanel, selectedPanel } = getContext(TABS);
  $$unsubscribe_selectedPanel = subscribe(selectedPanel, (value) => $selectedPanel = value);
  registerPanel(panel);
  $$unsubscribe_selectedPanel();
  return `${$selectedPanel === panel ? `${slots.default ? slots.default({}) : ``}` : ``}`;
});
const Tab = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $selectedTab, $$unsubscribe_selectedTab;
  const tab = {};
  const { registerTab, selectTab, selectedTab } = getContext(TABS);
  $$unsubscribe_selectedTab = subscribe(selectedTab, (value) => $selectedTab = value);
  registerTab(tab);
  $$unsubscribe_selectedTab();
  return `<button class="${"bg-transparent border-none outline-none m-0 text-lg " + escape(
    $selectedTab === tab ? "text:black dark:text-white" : "text-gray-500",
    true
  )}">${slots.default ? slots.default({}) : ``}</button>`;
});

export { Tabs as T, TabList as a, Tab as b, TabPanel as c };
//# sourceMappingURL=Tab-7a953107.js.map
