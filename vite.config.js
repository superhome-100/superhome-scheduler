import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
	server: { https: true },
	plugins: [sveltekit(), mkcert()],
	resolve: {
		alias: {
			$libs: path.resolve("./src/libs"),
			$types: path.resolve("./src/types.ts"),
		}
	}
});
