<script>
	import { getContext } from 'svelte';
	import { TABS } from './Tabs.svelte';

    const tab = {};
	const { registerTab, selectTab, selectedTab } = getContext(TABS);

	registerTab(tab);

</script>

<button 
    class="bg-transparent border-none outline-none m-0 text-lg {$selectedTab === tab ? 'text:black dark:text-white' : 'text-gray-500'}" 
    on:click="{() => selectTab(tab)}"
>
	<slot></slot>
</button>
