<template>
  <div
    class="relative bg-transparent border-b border-b-mono-600 group"
    :class="{ 'has-clear': clearable }"
  >
    <Icon
      :name="icon"
      class="absolute top-1/2 left-15 -translate-y-1/2 size-25 pointer-events-none text-mono-500 group-focus-within:text-mono-200"
    />
    <input
      ref="inputEl"
      v-model="value"
      type="text"
      class="h-60 appearance-none w-full bg-transparent !outline-none !ring-0 pl-50 !border-none text-lg font-bold placeholder:font-normal placeholder:text-mono-500 text-mono-100 group-focus-within:outline! group-focus-within:outline-white -outline-offset-2"
      :placeholder
      :class="{
        'pr-[45px]': clearable,
      }"
    />
    <button
      v-if="clearable && value"
      type="button"
      tabindex="-1"
      class="absolute top-1/2 right-0 -translate-y-1/2 size-50 flex items-center justify-center text-mono-200 group/button"
      :title="$t('clearInput', 'Clear input')"
      @click.prevent="onClear"
    >
      <Icon
        name="bk_mdi_close"
        class="size-25 bg-mono-700 p-5 rounded-full group-hover/button:bg-mono-600"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

withDefaults(
  defineProps<{
    placeholder?: string
    icon?: BlokkliIcon
    clearable?: boolean
  }>(),
  {
    placeholder: '',
    icon: 'bk_mdi_search',
    clearable: false,
  },
)

const value = defineModel<string>({ default: '' })

const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

const { $t } = useBlokkli()

function onClear() {
  value.value = ''
  inputEl.value?.focus()
}

defineExpose({
  focus: () => inputEl.value?.focus(),
  select: () => inputEl.value?.select(),
})
</script>
