<template>
  <Dropdown position="top-left" button-class="bk-chart-color-dropdown-button">
    <template #button>
      <span
        class="bk-chart-color-swatch bk-chart-data-table-input"
        :style="{ backgroundColor: displayColor }"
      />
    </template>
    <template #default="{ close }">
      <template v-for="entry in colorOptions" :key="entry.id">
        <DropdownItem
          v-if="!entry.shades?.length"
          :text="entry.label"
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
        </DropdownItem>
        <div v-else class="bk-chart-color-dropdown-shaded">
          <button
            class="bk-chart-color-dropdown-base"
            type="button"
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
          <div class="bk-chart-color-dropdown-shades">
            <button
              v-for="shade in entry.shades"
              :key="shade.id"
              type="button"
              class="bk-chart-color-dropdown-shade"
              :class="{ 'is-main': shade.isMain }"
              :title="`${entry.label} ${shade.id}`"
              @click="
                () => {
                  emit('select', `${entry.id}.${shade.id}`)
                  close()
                }
              "
            >
              <span
                class="bk-chart-color-swatch"
                :style="{ backgroundColor: shade.hex }"
              />
              <span class="bk-chart-color-dropdown-shade-label">{{
                shade.id
              }}</span>
            </button>
          </div>
        </div>
      </template>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Dropdown, DropdownItem } from '#blokkli/editor/components'

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

  .bk-chart-color-dropdown-shaded {
    @apply flex flex-col px-5 py-5 gap-5;
    @apply border-b border-mono-200 last:border-b-0;
  }

  .bk-chart-color-dropdown-base {
    @apply w-full flex items-center gap-8 px-5 py-5;
    @apply text-sm text-mono-700 text-left leading-none;
    @apply border-none bg-transparent cursor-pointer rounded;
    @apply hover:bg-mono-100 hover:text-mono-950;
  }

  .bk-chart-color-dropdown-shades {
    @apply flex items-stretch gap-3 pl-5;
  }

  .bk-chart-color-dropdown-shade {
    @apply flex flex-col items-center gap-3 px-3 py-3;
    @apply border-none bg-transparent cursor-pointer rounded;
    @apply hover:bg-mono-100;

    &.is-main .bk-chart-color-swatch:before {
      @apply opacity-100 border-mono-900;
    }
  }

  .bk-chart-color-dropdown-shade-label {
    @apply text-xs text-mono-600 leading-none;
  }
}
</style>
