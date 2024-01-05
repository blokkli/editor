<template>
  <button
    class="bk-list-item bk-clone"
    data-element-type="action"
    :data-sortli-id="id"
    :class="[
      {
        'bk-is-disabled': disabled,
      },
      'bk-is-' + orientation,
      'bk-is-' + color,
    ]"
  >
    <div class="bk-list-item-inner">
      <div class="bk-list-item-icon">
        <ItemIcon v-if="bundle" :bundle="bundle" />
        <Icon v-else-if="icon" :name="icon" />
      </div>
      <div
        class="bk-list-item-label"
        :class="{
          'bk-tooltip': orientation === 'horizontal' && !ui.isMobile.value,
        }"
      >
        <span>{{ label }}</span>
      </div>
    </div>

    <div
      class="bk-add-list-drop bk-drop-element"
      :class="['bk-is-' + color, { 'bk-is-dark': isDark }]"
    >
      <div class="bk-add-list-drop-icon">
        <ItemIcon v-if="bundle" :bundle="bundle" />
        <Icon v-else-if="icon" :name="icon" />
      </div>
      <span>{{ label }}</span>
    </div>
  </button>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli/icons'
import type { AddListOrientation } from '#blokkli/types'
import { useBlokkli } from '#imports'
import { ItemIcon, Icon } from '#blokkli/components'

const { ui } = useBlokkli()

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    orientation: AddListOrientation
    color?: 'rose' | 'lime' | 'default'
    bundle?: string
    icon?: BlokkliIcon
    disabled?: boolean
  }>(),
  {
    color: 'default',
    bundle: '',
    icon: undefined,
  },
)
const isDark = computed(
  () => props.orientation !== 'sidebar' && props.color === 'default',
)
</script>

<script lang="ts">
export default {
  name: 'AddListItem',
}
</script>
