import adapter from '@sveltejs/adapter-vercel'; // keep it in line 1
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: 'build'
		}),

		experimental: {
			tracing: {
				server: false
			},

			instrumentation: {
				server: true
			}
		}
	},
	preprocess: vitePreprocess()
};

export default config;
