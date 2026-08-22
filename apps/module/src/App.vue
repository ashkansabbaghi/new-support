<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAppearance } from '@/composables/useAppearance'
import { bindVisualViewportCssVars } from '@/composables/useVisualViewportCss'

const { locale } = useI18n()
const appearance = useAppearance()
const { locale: appearanceLocale, theme, direction } = storeToRefs(appearance)

let unbindViewport: (() => void) | undefined

watch(
  appearanceLocale,
  (value) => {
    locale.value = value
  },
  { immediate: true },
)

watch(
  [theme, direction, appearanceLocale],
  () => {
    const root = document.documentElement
    root.lang = appearanceLocale.value
    root.dir = direction.value
    root.classList.toggle('dark', theme.value === 'dark')
    root.style.colorScheme = theme.value
  },
  { immediate: true },
)

onMounted(() => {
  unbindViewport = bindVisualViewportCssVars()
})

onUnmounted(() => {
  unbindViewport?.()
})
</script>

<template>
  <RouterView />
</template>
