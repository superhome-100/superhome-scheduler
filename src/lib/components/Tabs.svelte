<script context="module">
	export const TABS = {};
</script>

<script> 
    export let tabIndex = 0;
    import { swipe } from 'svelte-gestures';
	import { setContext, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';

    const tabs = [];
	const panels = [];
	const selectedTab = writable(null);
	const selectedPanel = writable(null);

	setContext(TABS, {
		registerTab: tab => {
			tabs.push(tab);
			selectedTab.update(current => current || tab);

			onDestroy(() => {
				const i = tabs.indexOf(tab);
				tabs.splice(i, 1);
                selectedTab.update(
                    current => current === tab ? (tabs[i] || tabs[tabs.length - 1]) : current
                );
			});
		},

		registerPanel: panel => {
			panels.push(panel);
			selectedPanel.update(current => current || panel);
			
			onDestroy(() => {
				const i = panels.indexOf(panel);
				panels.splice(i, 1);
                selectedPanel.update(
                    current => current === panel 
                        ? (panels[i] || panels[panels.length - 1]) 
                        : current
                );
			});
		},

		selectTab: tab => {
			const i = tabs.indexOf(tab);
			selectedTab.set(tab);
			selectedPanel.set(panels[i]);
		},

		selectedTab,
		selectedPanel
    });

    $: {
        $selectedTab = tabs[tabIndex];
        $selectedPanel = panels[tabIndex];
    }

    function nextTab() {
        tabIndex = (tabIndex + 1 ) % tabs.length;
    }
    
    function prevTab() {
        tabIndex = (tabs.length + tabIndex - 1) % tabs.length;
    }

    function handleKeypress(e) {
        if (e.keyCode == 37) {
            prevTab();
        } else if (e.keyCode == 39) {
            nextTab();
        }
    }

    function handleSwipe(event) {
        if (event.detail.direction === 'left') {
            nextTab();         
        } else if (event.detail.direction === 'right') {
            prevTab();
        }
    }
</script>

<svelte:window on:keydown={handleKeypress}/>

<div 
    class="text-center min-h-[500px]" 
    use:swipe={{ timeframe: 300, minSwipeDistance: 10, touchAction: 'pan-y' }} 
    on:swipe={handleSwipe}
>
	<slot></slot>
</div>
