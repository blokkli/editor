<template>
  <div class="p-10">
    <slot name="before" />
    <div class="lg:flex lg:items-center lg:gap-10">
      <Icon :name="icon" class="size-25 mr-10 hidden lg:flex" />
      <div class="mr-auto">
        <slot>
          <!-- eslint-disable-next-line vue/no-v-html -- the callers build the markup and escape the values in it -->
          <p v-if="text" v-html="text" />
        </slot>
      </div>
      <slot name="before-button" />
      <button
        v-if="button"
        class="bk-button bk-is-small bk-is-dark"
        data-test="banner-button"
        @click="$emit('click')"
      >
        {{ button }}
        <Icon name="bk_mdi_close" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

withDefaults(
  defineProps<{
    icon: BlokkliIcon
    text?: string
    button?: string
  }>(),
  {
    text: undefined,
    button: undefined,
  },
)

defineEmits<{
  (e: 'click'): void
}>()
</script>
