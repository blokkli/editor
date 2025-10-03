<template>
  <div
    ref="el"
    class="bk bk-selection-add-overlay"
    :class="'bk-is-' + placementY"
    :style="{
      '--bk-caret-x': caretX,
    }"
  >
    <div class="bk bk-selection-add-overlay-inner bk-caret-tooltip-inner">
      <div v-if="label" class="bk-selection-add-overlay-label">
        <div v-html="label" />
        <button @click="$emit('close')">
          <Icon name="close" />
        </button>
      </div>
      <div class="bk-selection-add-overlay-list">
        <button
          v-for="item in items"
          :key="item.bundle"
          @click.prevent="$emit('select', item.bundle)"
        >
          <ItemIcon :bundle="item.bundle" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import useStickyToolbar from '#blokkli/helpers/composables/useStickyToolbar'
import {
  useTemplateRef,
  useBlokkli,
  computed,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import { ItemIcon, Icon } from '#blokkli/components'

const props = defineProps<{
  bundles: string[]
  anchorEl: HTMLElement
  label?: string
}>()

defineEmits<{
  (e: 'select', bundle: string): void
  (e: 'close'): void
}>()

const el = useTemplateRef('el')

const { types, ui } = useBlokkli()

const { placementY, caretX } = useStickyToolbar(el, {
  getAnchorElement() {
    return props.anchorEl
  },
  getPlacementY() {
    return 'auto'
  },
  getPlacementX() {
    return 'center'
  },
  getCaretWidth() {
    return 30
  },
})

const items = computed(() => {
  return props.bundles
    .map((bundle) => {
      return {
        bundle,
        label: types.getBlockBundleDefinition(bundle)?.label ?? bundle,
      }
    })
    .sort((a, b) => {
      return a.label.localeCompare(b.label)
    })
})

onMounted(() => {
  ui.hasAddTooltipOpen.value = true
})

onBeforeUnmount(() => {
  ui.hasAddTooltipOpen.value = false
})
</script>
