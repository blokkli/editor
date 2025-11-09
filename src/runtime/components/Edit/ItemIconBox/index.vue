<template>
  <div
    class="bk-item-icon"
    :class="[
      'bk-is-' + mappedColor,
      {
        'bk-is-small': isSmall,
      },
    ]"
  >
    <Icon v-if="icon" :name="icon" />
    <ItemIcon v-else-if="bundle" :bundle />
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { ItemIcon, Icon } from '#blokkli/components'
import {
  BUNDLE_BLOKKLI_FRAGMENT,
  BUNDLE_FROM_LIBRARY,
} from '#blokkli/constants'
import { computed } from '#imports'

type ItemColor = 'rose' | 'lime' | 'default' | 'yellow' | 'accent'

const props = withDefaults(
  defineProps<{
    icon?: BlokkliIcon
    bundle?: string
    color?: ItemColor
    isSmall?: boolean
  }>(),
  {
    icon: undefined,
    bundle: undefined,
    color: undefined,
    isSmall: false,
  },
)

const mappedColor = computed<ItemColor>(() => {
  if (props.color) {
    return props.color
  } else if (props.bundle) {
    if (props.bundle === BUNDLE_BLOKKLI_FRAGMENT) {
      return 'accent'
    } else if (props.bundle === BUNDLE_FROM_LIBRARY) {
      return 'lime'
    }
  }

  return 'default'
})
</script>
