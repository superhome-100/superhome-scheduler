import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import path from 'path';

export default defineConfig({
	server: { https: true },
	plugins: [sveltekit(), mkcert()],
	resolve: {
		alias: {
			$utils: path.resolve('./src/utils'),
			$libs: path.resolve('./src/libs'),
			$types: path.resolve('./src/types.ts')
		}
	}
});
