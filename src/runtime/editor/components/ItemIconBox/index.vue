<template>
  <div
    class="bk-item-icon"
    :class="[
      'bk-is-' + mappedColor,
      {
        'bk-is-small': isSmall,
        'bk-is-tiny': isTiny,
      },
    ]"
  >
    <Icon v-if="icon" :name="icon" />
    <ItemIcon v-else-if="bundle" :bundle />
  </div>
</template>

<script setup lang="ts">
import { fragmentBlockBundle, fromLibraryBlockBundle } from '#blokkli-build/config';
import type { BlokkliIcon } from '#blokkli-build/icons'
import { ItemIcon, Icon } from '#blokkli/editor/components'
import { computed } from '#imports'

type ItemColor = 'rose' | 'lime' | 'default' | 'yellow' | 'accent' | 'orange'

const props = withDefaults(
  defineProps<{
    icon?: BlokkliIcon | null
    bundle?: string
    color?: ItemColor
    isSmall?: boolean
    isTiny?: boolean
  }>(),
  {
    icon: undefined,
    bundle: undefined,
    color: undefined,
    isSmall: false,
    isTiny: false,
  },
)

const mappedColor = computed<ItemColor>(() => {
  if (props.color) {
    return props.color
  } else if (props.bundle) {
    if (props.bundle === fragmentBlockBundle) {
      return 'accent'
    } else if (props.bundle === fromLibraryBlockBundle) {
      return 'lime'
    }
  }

  return 'default'
})
</script>
