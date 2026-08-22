<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { createSupportClient, type SupportClient } from '@nipoto/support-web-sdk'

/**
 * Thin Vue host. Public Web SDK only — no Support app internals.
 */
let client: SupportClient | null = null

onMounted(() => {
  client = createSupportClient({
    origin: 'http://localhost:5173',
    widgetId: 'wid_public_example',
    locale: 'fa-IR',
  })
})

onUnmounted(() => {
  void client?.dispose()
  client = null
})
</script>

<template>
  <main>Vue host — Support UI stays in the iframe.</main>
</template>
