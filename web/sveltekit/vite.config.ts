// Importing necessary plugins and functions for Vite configuration
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Exporting the Vite configuration
export default defineConfig({
	// Adding plugins for TailwindCSS and SvelteKit
	plugins: [tailwindcss(), sveltekit()]
});
