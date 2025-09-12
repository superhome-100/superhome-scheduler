import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	server: { https: false, port: 5175, strictPort: true },
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$utils: path.resolve('./src/utils'),
			$libs: path.resolve('./src/libs'),
			$types: path.resolve('./src/types.ts')
		}
	}
});
