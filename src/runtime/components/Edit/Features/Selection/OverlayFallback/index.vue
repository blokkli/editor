<template>
  <Teleport :to="artboard">
    <div class="bk bk-selection-overlay-fallback">
      <div
        v-for="item in items"
        :key="item.uuid"
        :style="{
          top: item.rect.y + 'px',
          left: item.rect.x + 'px',
          width: item.rect.width + 'px',
          height: item.rect.height + 'px',
        }"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { falsy } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { useBlokkli, computed } from '#imports'

const props = defineProps<{
  uuids: string[]
}>()

const { ui, dom } = useBlokkli()

const artboard = ui.artboardElement()

const items = computed(() => {
  return props.uuids
    .map((uuid) => {
      const block = dom.findBlock(uuid)
      if (!block) {
        return null
      }

      const rect = dom.getBlockRect(uuid)
      if (!rect) {
        return null
      }

      return { uuid, rect }
    })
    .filter(falsy)
})

onBlokkliEvent('animationFrame', function () {})
</script>
