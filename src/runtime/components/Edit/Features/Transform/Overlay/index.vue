<template>
  <Teleport to="body">
    <div
      v-if="style && possibleTransform"
      class="bk bk-transform-overlay"
      :class="{ 'bk-is-active': keyboard.isPressingControl.value }"
      :style="style"
    >
      <div class="bk-transform-overlay-label">
        <span>{{ possibleTransform.plugin.label }}</span>
        <kbd>CTRL</kbd>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onBeforeUnmount } from '#imports'
import type { TransformPlugin, Rectangle } from '#blokkli/types'
import { filterTransforms } from '#blokkli/helpers/transform'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { dom, types, keyboard } = useBlokkli()

const emit = defineEmits<{
  (e: 'transform', data: { uuids: string[]; plugin: TransformPlugin }): void
}>()

const props = defineProps<{
  // The item bundles in the current selection.
  selectedBundles: string[]
  selectedUuids: string[]
  plugins: TransformPlugin[]
}>()

const allItems = computed(() => dom.getAllBlocks())

const bundleMap = computed(() =>
  allItems.value.reduce<Record<string, string>>((acc, item) => {
    acc[item.uuid] = item.itemBundle
    return acc
  }, {}),
)

const hoveredUuid = ref('')
const hoveredRect = ref<Rectangle | null>(null)

const hoveredBundle = computed(() =>
  hoveredUuid.value ? bundleMap.value[hoveredUuid.value] : undefined,
)

const allowedBundlesInList = computed<string[]>(() => {
  if (!hoveredBundle.value) {
    return []
  }
  const item = allItems.value.find((v) => v.uuid === hoveredUuid.value)
  if (!item) {
    return []
  }

  return (
    types.fieldConfig.value.find(
      (v) =>
        v.name === item.hostFieldName &&
        v.entityType === item.hostType &&
        v.entityBundle === item.hostBundle,
    )?.allowedBundles || []
  )
})

const style = computed(() => {
  if (!hoveredRect.value) {
    return
  }
  return {
    width: hoveredRect.value.width + 'px',
    height: hoveredRect.value.height + 'px',
    transform: `translate(${hoveredRect.value.x}px, ${hoveredRect.value.y}px)`,
  }
})

type PossibleTransform = {
  plugin: TransformPlugin
  uuids: string[]
}

const possibleTransform = ref<PossibleTransform | null>(null)

onBlokkliEvent('animationFrame', (e) => {
  // Hasn't changed, return.
  hoveredUuid.value = e.hoveredUuid

  // Nothing to do when no item is being hovered.
  if (!hoveredUuid.value) {
    hoveredRect.value = null
    possibleTransform.value = null
    return
  }

  if (props.selectedUuids.includes(hoveredUuid.value)) {
    hoveredRect.value = null
    possibleTransform.value = null
    return
  }

  hoveredRect.value = e.rects[hoveredUuid.value]
  possibleTransform.value = setPossibleTransform()
})

const setPossibleTransform = () => {
  if (hoveredUuid.value && hoveredBundle.value && hoveredRect.value) {
    const uuids = [...props.selectedUuids, hoveredUuid.value]
    const plugin = filterTransforms(
      props.plugins,
      uuids,
      [...props.selectedBundles, hoveredBundle.value],
      allowedBundlesInList.value,
    )[0]
    if (plugin) {
      return { plugin, uuids }
    }
  }
  return null
}

onBeforeUnmount(() => {
  if (
    hoveredUuid.value &&
    possibleTransform.value &&
    keyboard.isPressingControl.value
  ) {
    emit('transform', possibleTransform.value)
  }
})
</script>
