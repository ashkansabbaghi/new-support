<script setup lang="ts">
import { MessageCircle } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUiStore()
</script>

<template>
  <Button
    type="button"
    size="icon-lg"
    class="size-14 rounded-full shadow-support-primary"
    :aria-label="t('widget.launcher')"
    :aria-expanded="ui.drawerOpen"
    @click="ui.openDrawer()"
  >
    <MessageCircle class="size-6" />
  </Button>
</template>
