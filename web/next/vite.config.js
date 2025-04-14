// Import necessary modules from Vite and TailwindCSS
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Export the Vite configuration
export default defineConfig({
  // Add TailwindCSS as a plugin
  plugins: [tailwindcss()],
});
