<template>
  <Dropdown
    position="top-left"
    button-class="size-40 flex items-center justify-center group"
    :teleport="popupHost ?? undefined"
  >
    <template #button>
      <span
        class="bk-chart-color-swatch bk-chart-data-table-input group-hover:outline-2 group-hover:outline-mono-100/40 group-hover:-outline-offset-2 group-hover:before:opacity-80"
        :style="{ backgroundColor: displayColor }"
      />
    </template>
    <template #default="{ close }">
      <div
        v-if="hasAnyShades"
        class="p-5 flex flex-wrap relative"
        :style="{
          maxWidth: maxShades * 40 + 10 + 'px',
        }"
      >
        <div
          v-for="row in colorRows"
          :key="row.entryId"
          class="flex items-center"
        >
          <button
            v-for="item in row.items"
            :key="item.colorId"
            type="button"
            class="group/tooltip flex border-none bg-transparent cursor-pointer size-40 items-center justify-center group"
            @click="onSelect(item.colorId)"
          >
            <span
              class="bk-chart-color-swatch outline-2 outline-offset-2 outline-transparent size-30!"
              :class="[
                {
                  'bk-is-main': item.isMain,
                },
                isSelected(item.colorId)
                  ? 'outline-mono-900!'
                  : 'group-hover:outline-mono-300',
              ]"
              :style="{ backgroundColor: item.hex }"
            />
            <Tooltip :label="item.label" placement="above-left" small />
          </button>
        </div>
      </div>
      <template v-else>
        <DropdownItem
          v-for="entry in colorOptions"
          :key="entry.id"
          :text="entry.label"
          :class="{ 'bg-mono-100 text-mono-950': isSelected(entry.id) }"
          @click="(onSelect(entry.id), close())"
        >
          <span
            class="bk-chart-color-swatch"
            :style="{ backgroundColor: entry.hex }"
          />
        </DropdownItem>
      </template>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed, inject, useBlokkli } from '#imports'
import { Dropdown, DropdownItem, Tooltip } from '#blokkli/editor/components'
import { INJECT_POPUP_HOST } from '#blokkli/editor/helpers/injections'

const props = defineProps<{
  colorId: string
}>()

const emit = defineEmits<{
  select: [colorId: string]
}>()

const { config, $t } = useBlokkli()
const colorOptions = computed(() => config.colorOptions.value)
const hasAnyShades = computed(() =>
  colorOptions.value.some((entry) => entry.shades?.length),
)
const displayColor = computed(() => config.getColorHex(props.colorId))

const popupHostRef = inject(INJECT_POPUP_HOST, null)
const popupHost = computed(() => popupHostRef?.value ?? null)

const colorRows = computed(() =>
  colorOptions.value
    .map((entry) => ({
      entryId: entry.id,
      items: entry.shades?.length
        ? entry.shades.map((shade) => ({
            colorId: shade.isMain ? entry.id : `${entry.id}.${shade.id}`,
            label: shade.isMain
              ? `${entry.label} ${shade.id} (${$t('chartsColorMain', 'main color')})`
              : `${entry.label} ${shade.id}`,
            hex: shade.hex,
            isMain: !!shade.isMain,
          }))
        : [
            {
              colorId: entry.id,
              label: entry.label,
              hex: entry.hex,
              isMain: false,
            },
          ],
    }))
    .sort((a, b) => b.items.length - a.items.length),
)

const maxShades = computed(() =>
  colorOptions.value.reduce(
    (max, entry) => Math.max(max, entry.shades?.length ?? 0),
    0,
  ),
)

function isSelected(id: string): boolean {
  return props.colorId === id
}

function onSelect(id: string): void {
  emit('select', id)
}
</script>

<style lang="postcss">
.bk {
  .bk-chart-color-swatch {
    @apply rounded-full block size-20 relative;

    &.bk-is-main:before {
      content: '';
      @apply absolute size-8 bg-mono-900 rounded-full;
      @apply left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2;
    }
  }
}
</style>
