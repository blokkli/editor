<template>
  <Teleport to="#bk-indicators-left">
    <div
      ref="el"
      class="bk-indicator-item"
      @click.prevent="$emit('click')"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <slot>
        <div class="bk-indicator-item-inner">
          <div v-if="label">{{ label }}</div>
          <div v-if="icon">
            <Icon :name="icon" />
          </div>
        </div>
      </slot>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  onMounted,
  useTemplateRef,
  onBeforeUnmount,
} from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

const props = defineProps<{
  /**
   * Unique identifier for this indicator.
   *
   * Should be unique per block instance.
   */
  id: string

  /**
   * The UUID of the block this indicator is attached to.
   */
  uuid: string

  /**
   * Optional text label to display in the indicator.
   */
  label?: string

  /**
   * Which side of the block to display the indicator.
   *
   * @default 'left'
   */
  position?: 'left' | 'right'

  /**
   * Optional icon to display in the indicator.
   */
  icon?: BlokkliIcon
}>()

defineEmits<{
  (e: 'click'): void
}>()

const { indicators } = useBlokkli()

const el = useTemplateRef('el')

function onMouseEnter() {
  indicators.setHovered(props.uuid)
}

function onMouseLeave() {
  indicators.setHovered()
}

onMounted(() => {
  if (el.value) {
    indicators.addIndicator({
      id: props.id,
      uuid: props.uuid,
      position: props.position ?? 'left',
      element: el.value,
    })
  }
})

onBeforeUnmount(() => {
  indicators.removeIndicator(props.id, props.uuid)
})
</script>

<script lang="ts">
export default {
  name: 'PluginBlockIndicator',
}
</script>
