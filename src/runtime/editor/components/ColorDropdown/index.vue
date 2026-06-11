<template>
  <Dropdown
    position="top-left"
    :button-class="
      buttonClass ?? 'size-40 flex items-center justify-center group'
    "
  >
    <template #button>
      <slot :display-color>
        <span
          class="rounded-full block size-20 relative group-hover:outline-2 group-hover:outline-mono-100/40 group-hover:-outline-offset-2 group-hover:before:opacity-80"
          :style="{ backgroundColor: displayColor }"
        />
      </slot>
    </template>
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
          @click="selectedId = item.colorId"
        >
          <span
            class="rounded-full block relative outline-2 outline-offset-2 outline-transparent size-30"
            :class="[
              item.isMain && [
                'before:content-empty before:absolute before:size-8 before:rounded-full before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2',
                item.isLightBg ? 'before:bg-black' : 'before:bg-white',
              ],
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
        @click="selectedId = entry.id"
      >
        <span
          class="rounded-full block size-20 relative"
          :style="{ backgroundColor: entry.hex }"
        />
      </DropdownItem>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Dropdown, DropdownItem, Tooltip } from '#blokkli/editor/components'
import { isLightHex } from '#blokkli/editor/helpers/color'

defineProps<{
  buttonClass?: string
}>()

const selectedId = defineModel<string>({
  default: '',
})

const { config, $t } = useBlokkli()
const colorOptions = computed(() => config.colorOptions.value)
const hasAnyShades = computed(() =>
  colorOptions.value.some((entry) => entry.shades?.length),
)
const displayColor = computed(() => config.getColorHex(selectedId.value))

const colorRows = computed(() =>
  colorOptions.value
    .map((entry) => ({
      entryId: entry.id,
      items: entry.shades?.length
        ? entry.shades.map((shade) => ({
            // Always emit the shade-qualified form for ramped colors — the
            // bare base id is never emitted from this component, so consumers
            // can compare ids with naive string equality without knowing
            // which shade was declared as the family's main.
            colorId: `${entry.id}.${shade.id}`,
            label: shade.isMain
              ? `${entry.label} ${shade.id} (${$t('mainColor', 'main color')})`
              : `${entry.label} ${shade.id}`,
            hex: shade.hex,
            isMain: !!shade.isMain,
            isLightBg: isLightHex(shade.hex),
          }))
        : [
            {
              colorId: entry.id,
              label: entry.label,
              hex: entry.hex,
              isMain: false,
              isLightBg: isLightHex(entry.hex),
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
  return selectedId.value === id
}
</script>
