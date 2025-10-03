<template>
  <Teleport to="body">
    <div ref="el" class="bk bk-selection-add-overlay">
      <div class="bk bk-selection-add-overlay-inner">
        <div
          v-if="label"
          class="bk-selection-add-overlay-label"
          v-html="label"
        />
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
  </Teleport>
</template>

<script setup lang="ts">
import useStickyToolbar from '#blokkli/helpers/composables/useStickyToolbar'
import { useTemplateRef, useBlokkli, computed } from '#imports'
import { ItemIcon } from '#blokkli/components'

const props = defineProps<{
  bundles: string[]
  anchorEl: HTMLElement
  label?: string
}>()

defineEmits<{
  (e: 'select', bundle: string): void
}>()

const el = useTemplateRef('el')

const { types } = useBlokkli()

useStickyToolbar(el, {
  getAnchorElement() {
    return props.anchorEl
  },
  getPlacementY() {
    return 'bottom'
  },
  getPlacementX() {
    return 'center'
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
</script>
