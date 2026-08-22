<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { Badge } from '@/components/ui/badge'
import { statusI18nKey } from '@/domain'

const props = withDefaults(
  defineProps<{
    status?: string
  }>(),
  {
    status: 'opened',
  },
)

const { t } = useI18n()
const label = computed(() => t(statusI18nKey(props.status)))
</script>

<template>
  <Badge
    variant="secondary"
    class="max-w-full truncate text-[11px]"
  >
    {{ label }}
  </Badge>
</template>
