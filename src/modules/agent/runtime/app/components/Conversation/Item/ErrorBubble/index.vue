<template>
  <div
    class="flex items-start gap-8 p-10 rounded-xl my-15 bg-red-light text-red-dark text-sm"
  >
    <Icon
      name="bk_mdi_priority_high"
      class="size-18 shrink-0 bg-red-normal text-white rounded-full p-2"
    />
    <span>{{ text }}</span>
    <button
      v-if="retryable"
      class="text-red-dark font-bold underline cursor-pointer ml-auto"
      @click.prevent="$emit('retry')"
    >
      {{ $t('aiAgentRetry', 'Retry') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  text: string
  retryable?: boolean
}>()

defineEmits<{
  (e: 'retry'): void
}>()

const { $t } = useBlokkli()
</script>
