const config = {
	content: [ 
        './src/**/*.{html,js,svelte,ts}',
        "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
    ],

	theme: {
		extend: {
            colors: {
                'pool-bg-from': '#0E7490',
                'pool-bg-to': '#22D3EE',
                'pool-bg': '#60A5FA', //'#1D4ED8',
                'pool-fg': '#FFFFFF',
                'openwater-bg-from': '#081F69', //'#1D4ED8', //'#3CD4BE',
                'openwater-bg-to': '#1254A7', // '#06B6D4',
                'openwater-fg': '#FFFFFF', //'#1D293A',
                'classroom-bg-to': '#FB7185', //'#FDE047'
                'classroom-bg-from': '#9F123B', 
                'classroom-fg': '#FFFFFF'
            }
        }
	},
    darkMode: 'media',
	plugins: [
        require('flowbite/plugin')
    ],
};

module.exports = config;
