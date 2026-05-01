<template>
  <Dropdown position="top-left" button-class="bk-chart-color-dropdown-button">
    <template #button>
      <span
        class="bk-chart-color-swatch bk-chart-data-table-input"
        :style="{ backgroundColor: displayColor }"
      />
    </template>
    <template #default="{ close }">
      <button
        v-for="entry in colorOptions"
        :key="entry.id"
        type="button"
        class="bk-dropdown-menu-item"
        :class="{ 'is-active': colorId === entry.id }"
        @click="
          () => {
            emit('select', entry.id)
            close()
          }
        "
      >
        <span
          class="bk-chart-color-swatch"
          :style="{ backgroundColor: entry.hex }"
        />
        <span>{{ entry.label }}</span>
      </button>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Dropdown } from '#blokkli/editor/components'

const props = defineProps<{
  colorId: string
}>()

const emit = defineEmits<{
  select: [colorId: string]
}>()

const { config } = useBlokkli()
const colorOptions = computed(() => config.colorOptions.value)

const displayColor = computed(() => config.getColorHex(props.colorId))
</script>

<style>
.bk {
  .bk-chart-color-swatch {
    @apply rounded-full block border border-mono-300 size-20;
  }

  .bk-chart-color-dropdown-button {
    @apply size-40 flex items-center justify-center;
  }

  .bk-chart-color-option {
    @apply w-full flex items-center gap-8 px-10 py-8;
    @apply text-sm text-mono-700 text-left;
    @apply border-none bg-transparent cursor-pointer;
    @apply hover:bg-mono-100 hover:text-mono-950;
    @apply whitespace-nowrap leading-none;

    &.is-active {
      @apply bg-mono-100 font-semibold text-mono-950;
    }
  }
}
</style>
