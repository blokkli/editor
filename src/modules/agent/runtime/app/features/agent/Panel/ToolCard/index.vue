<template>
  <div class="mt-15 border border-mono-300 bg-white rounded overflow-hidden">
    <div
      class="flex items-center gap-5 font-medium justify-between bg-mono-100 border-b border-mono-300 pl-10 pr-5 py-10"
    >
      <div class="flex text-sm gap-5">
        <Icon :name="icon" class="size-18" />
        <span class="flex-1">{{ title }}</span>
      </div>
      <div v-if="!hideCancel" class="-my-5">
        <ButtonAction
          :label="$t('aiAgentReject', 'Reject')"
          icon="bk_mdi_close"
          theme="danger"
          class="relative"
          @click="$emit('cancel')"
        />
      </div>
    </div>

    <slot />

    <div
      v-if="$slots.actions"
      class="flex gap-8 p-10 bg-white border-t border-t-mono-200"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon, ButtonAction } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { useBlokkli } from '#imports'

defineProps<{
  icon: BlokkliIcon
  title: string
  hideCancel?: boolean
}>()

defineEmits<{
  (e: 'cancel'): void
}>()

const { $t } = useBlokkli()
</script>
