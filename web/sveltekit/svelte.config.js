// Importing the SvelteKit adapter and preprocessors
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit configuration object
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	// Preprocessors for Svelte files
	preprocess: vitePreprocess(),

	kit: {
		// Adapter configuration for deployment
		adapter: adapter()
	}
};

// Exporting the configuration
export default config;
