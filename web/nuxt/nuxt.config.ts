// Nuxt configuration file
// Documentation: https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  // Runtime configuration for sensitive data
  runtimeConfig: {
    clientId: process.env.CASHFREE_PG_APP_ID, // Cashfree Payment Gateway App ID
    clientSecret: process.env.CASHFREE_PG_SECRET_KEY, // Cashfree Payment Gateway Secret Key
  },

  // Compatibility date for Nuxt features
  compatibilityDate: "2024-11-01",

  // Enable developer tools for debugging
  devtools: { enabled: true },

  // Automatically import components
  components: true,
});
