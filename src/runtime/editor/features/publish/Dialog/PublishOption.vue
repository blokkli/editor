<template>
  <label
    class="group relative grid grid-cols-[auto_1fr] gap-15 items-center leading-none cursor-pointer hyphens-auto"
    :data-test="'publish-mode-' + id"
    :data-test-checked="isChecked"
    :class="{ 'pointer-events-none': disabled }"
  >
    <input
      v-model="value"
      type="radio"
      :value="id"
      required
      name="publish-mode"
      :disabled
      class="appearance-none absolute top-0 left-0 opacity-0"
    />
    <div
      class="relative size-[60px] rounded-full border flex items-center justify-center [&_.bk-icon]:size-30 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-current"
      :class="{
        'border-mono-300! text-mono-300!': disabled,
        'border-red-normal text-red-normal group-hover:bg-red-light':
          !disabled && !isChecked && color === 'red',
        'border-yellow-normal text-yellow-normal group-hover:bg-yellow-light':
          !disabled && !isChecked && color === 'yellow',
        'border-lime-normal text-lime-normal group-hover:bg-lime-light':
          !disabled && !isChecked && color === 'lime',
        'bg-red-normal text-red-light border-red-dark ring-4 ring-red-normal/30 outline outline-1 outline-red-dark/60':
          !disabled && isChecked && color === 'red',
        'bg-yellow-normal text-yellow-dark ring-4 ring-yellow-normal/30 outline outline-1 outline-yellow-dark/70':
          !disabled && isChecked && color === 'yellow',
        'bg-lime-normal text-white ring-4 ring-lime-normal/30 outline outline-1 outline-lime-dark':
          !disabled && isChecked && color === 'lime',
      }"
    >
      <Icon :name="icon" />
      <div
        class="absolute top-[-1px] right-[-9px] size-20 rounded-full bg-mono-950 flex items-center justify-center [&_.bk-icon_svg]:size-[13px] [&_.bk-icon_svg]:fill-white"
        :class="isChecked ? 'visible' : 'invisible'"
      >
        <Icon name="bk_mdi_check" />
      </div>
    </div>
    <div>
      <div
        class="font-bold text-lg leading-none!"
        :class="{
          'text-mono-300': disabled,
          'text-mono-950': !disabled && isChecked,
          'text-mono-700': !disabled && !isChecked,
        }"
      >
        {{ label }}
      </div>
      <div
        class="text-sm mt-3 leading-tight text-balance"
        :class="disabled ? 'text-mono-300' : 'text-mono-600'"
      >
        {{ description }}
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

export type PublishOptionProps = {
  id: string
  label: string
  description: string
  icon: BlokkliIcon
  color: 'lime' | 'yellow' | 'red'
  disabled?: boolean
}

const props = defineProps<PublishOptionProps>()

const value = defineModel<string>()

const isChecked = computed(() => value.value === props.id)
</script>
