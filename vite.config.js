import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import pkg from './package.json';
import path from 'path';

export default defineConfig({
	server: {
		https: false,
		port: 5175,
		strictPort: true
	},
	plugins: [
		sentrySvelteKit({
			org: 'superhome',
			project: 'scheduler'
		}),
		sveltekit()
	],
	resolve: {
		alias: {
			$utils: path.resolve('./src/utils'),
			$libs: path.resolve('./src/libs'),
			$types: path.resolve('./src/types.ts')
		}
	},
	build: {
		sourcemap: (process.env.PUBLIC_STAGE ?? 'production') !== 'production' ? true : false,
		minify: (process.env.PUBLIC_STAGE ?? 'production') === 'production' ? 'esbuild' : false
	},
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	}
});
