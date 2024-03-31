<template>
  <div v-show="!selection.isDragging.value" class="bk bk-field-areas">
    <div
      v-for="area in areas"
      :key="area.key"
      class="bk-field-area"
      :style="area.style"
      :class="{ 'bk-is-active': area.key === selection.activeFieldKey.value }"
      @click="eventBus.emit('setActiveFieldKey', area.key)"
    >
      <div>
        <span>{{ area.label }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { eventBus, selection } = useBlokkli()

type FieldArea = {
  key: string
  name: string
  label: string
  style: {
    transform: string
  }
}

const areas = ref<FieldArea[]>([])
</script>
