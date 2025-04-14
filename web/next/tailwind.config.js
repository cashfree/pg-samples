/**
 * TailwindCSS configuration file
 * Specifies the content paths and theme customizations
 */
module.exports = {
  // Define the paths to all template files
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Extend the default theme
    extend: {},
  },
  plugins: [], // Add any TailwindCSS plugins here
};
