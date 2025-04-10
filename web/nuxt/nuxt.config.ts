// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    clientId: process.env.CASHFREE_PG_APP_ID,
    clientSecret: process.env.CASHFREE_PG_SECRET_KEY
  },

  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  components: true,
})
