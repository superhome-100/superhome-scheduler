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
                'pool-fg': '#FFFFFF',
                'openwater-bg-from': '#081F69', //'#1D4ED8', //'#3CD4BE',
                'openwater-bg-to': '#3070B7', // '#06B6D4',
                'openwater-fg': '#FFFFFF', //'#1D293A',
                'classroom-bg-from': '#000000', //'#000', //'#9F123B', 
                'classroom-bg-to': '#888888', //'#FB7185', //'#FDE047'
                'classroom-fg': '#FFFFFF',
                'root-bg-light': '#FFFFFF',
                'root-bg-dark': '#242420',
                'status-pending': '#FFFF00',
                'status-confirmed': '#00FF00',
            }
        }
	},
    darkMode: 'media',
	plugins: [
        require('flowbite/plugin'),
        require('daisyui')
    ],
};

module.exports = config;
