<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
useHead({
  script: [
    {
      src: 'https://sdk.cashfree.com/js/v3/cashfree.js',
      defer: true
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
      defer: true
    },
  ]
})
</script>