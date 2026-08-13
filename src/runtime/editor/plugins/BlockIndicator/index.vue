<template>
  <Teleport to="#bk-indicators-left">
    <div
      ref="el"
      class="bk-indicator-item absolute top-0 pointer-events-auto cursor-pointer text-mono-500 h-30 flex items-center hover:text-mono-950 group"
      :class="{
        'right-0 pr-10': position === 'left',
      }"
      :data-test-block-indicator="id"
      :data-test-uuid="uuid"
      @click.prevent="$emit('click')"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <slot>
        <div
          class="bk-indicator-item-inner flex gap-10 items-center text-xs font-medium"
        >
          <div v-if="label">{{ label }}</div>
          <div v-if="icon">
            <Icon
              :name="icon"
              class="size-20 bg-red-normal text-white p-2 rounded-full group-hover:bg-red-dark"
            />
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

const props = withDefaults(
  defineProps<{
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

    /**
     * Keep the indicator visible when the artboard edge is close to the
     * edge of the visible viewport.
     *
     * Instead of moving out of view, the indicator is shifted onto the
     * artboard so that at least the icon remains visible. Only supported
     * for left-positioned indicators.
     */
    sticky?: boolean
  }>(),
  {
    position: 'left',
    label: undefined,
    icon: undefined,
    sticky: false,
  },
)

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
      sticky: props.sticky,
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
