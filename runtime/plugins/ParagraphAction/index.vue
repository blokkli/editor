<template>
  <Teleport to="#bk-blokkli-item-actions">
    <button
      :disabled="isDisabled"
      @click="onClick"
      :class="{ 'bk-is-active': active }"
      :style="{ order: weight || 0 }"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        <span>{{ title }}</span>
        <ShortcutIndicator
          v-if="keyCode"
          :meta="meta"
          :key-code="keyCode"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>
  <Teleport to="#bk-blokkli-item-actions-after">
    <slot
      :paragraphUuid="paragraphUuid"
      :paragraphs="selection.blocks.value"
      :uuids="uuids"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'
import { DraggableExistingParagraphItem } from '#blokkli/types'
import { ShortcutIndicator } from '#blokkli/components'

const { selection } = useBlokkli()

const paragraphUuid = computed(() => selection.blocks.value[0]?.uuid)
const uuids = computed(() => selection.uuids.value)

const props = defineProps<{
  /**
   * The title of the action.
   */
  title: string

  /**
   * Whether the action is disabled.
   */
  disabled?: boolean

  /**
   * Whether the button should be displayed in an active state (e.g. when it's a dropdown).
   */
  active?: boolean

  /**
   * The key code to use for the shortcut.
   */
  keyCode?: string

  /**
   * Wheter the shortcut needs the meta modifier key.
   */
  meta?: boolean

  /**
   * Whether the action supports multiple paragraphs.
   */
  multiple?: boolean

  /**
   * The weight, used for positioning the button.
   */
  weight?: number

  icon?: BlokkliIcon
}>()

const isDisabled = computed(
  () =>
    props.disabled || (!props.multiple && selection.blocks.value.length > 1),
)

const emit = defineEmits<{
  (e: 'click', items: DraggableExistingParagraphItem[]): void
}>()

const onClick = () => {
  if (isDisabled.value || !paragraphUuid.value) {
    return
  }

  emit('click', selection.blocks.value)
}
</script>
