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
        class="bk-dropdown-menu-item min-w-[200px] group/item"
        :class="{ 'bk-is-active': colorId === entry.id }"
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
        <span
          :class="{
            'text-mono-500 font-normal group-hover/item:text-mono-900':
              colorId !== entry.id,
            'font-bold': colorId === entry.id,
          }"
          >{{ entry.label }}</span
        >
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

<style lang="postcss">
.bk {
  .bk-chart-color-dropdown-button {
    @apply size-40 flex items-center justify-center;

    &:hover {
      .bk-chart-color-swatch {
        @apply outline-2 outline-mono-100/40 -outline-offset-2;
        &:before {
          @apply opacity-80;
        }
      }
    }
  }

  .bk-chart-color-swatch {
    @apply rounded-full block size-20 relative;

    &:before {
      content: '';
      @apply absolute top-0 left-0 size-full rounded-full;
      @apply border border-mono-900 opacity-40;
    }
  }
}
</style>
