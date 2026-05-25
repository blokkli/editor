<template>
  <PluginContextMenu
    :id="'add_list_item_' + context + id"
    ref="pluginContextMenu"
    tag="button"
    type="button"
    class="bk-add-item"
    :menu="menu"
    :data-sortli-id="id"
    :data-test="'add-list-item-' + id"
    :data-test-disabled="disabled"
    :class="[
      {
        'bk-is-disabled': disabled,
      },
      'bk-is-' + color,
    ]"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="bk-add-item-icon">
      <ItemIconBox :color :bundle :icon />
    </div>
    <div class="bk-add-item-label">
      <span>{{ label }}{{ isAutoAdd ? '' : '...' }}</span>
    </div>
  </PluginContextMenu>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli-build/icons'
import { useBlokkli, computed, useTemplateRef } from '#imports'
import { ItemIconBox } from '#blokkli/editor/components'
import { PluginContextMenu } from '#blokkli/editor/plugins'
import type { ContextMenu } from '#blokkli/editor/types/ui'

const { storage, $t } = useBlokkli()

export type AddListItemProps = {
  id: string
  context: string
  label: string
  description?: string
  color?: 'rose' | 'lime' | 'default' | 'yellow' | 'accent' | 'orange'
  bundle?: string
  icon?: BlokkliIcon
  disabled?: boolean
  isAutoAdd?: boolean
  noContextMenu?: boolean
  useHelp?: boolean
  helpActive?: boolean
}

const emit = defineEmits<{
  (e: 'help' | 'startHelp', d: HTMLElement): void
}>()

const props = withDefaults(defineProps<AddListItemProps>(), {
  color: 'default',
  bundle: '',
  description: '',
  icon: undefined,
})

const el = useTemplateRef('pluginContextMenu')

const favorites = storage.use<string[]>('blockFavorites', [])

const isFavorite = computed(() => favorites.value.includes(props.id))

const toggleFavorite = () => {
  if (favorites.value.includes(props.id)) {
    favorites.value = favorites.value.filter((v) => v !== props.id)
  } else {
    favorites.value = [...favorites.value, props.id]
  }
}

const menu = computed<ContextMenu[]>(() => {
  if (props.noContextMenu) {
    return []
  }
  return [
    {
      type: 'button',
      label: isFavorite.value
        ? $t('addListItemFavoriteRemove', 'Remove from favorites')
        : $t('addListItemFavoriteAdd', 'Add to favorites'),
      icon: isFavorite.value ? 'unstar' : 'star',
      callback: toggleFavorite,
    },
  ]
})

const getElement = (): HTMLElement | null => el.value?.$el

let helpTimeout: number | null = null

function onMouseEnter() {
  if (!props.useHelp) {
    return
  }

  if (helpTimeout) {
    window.clearTimeout(helpTimeout)
    helpTimeout = null
  }

  if (props.helpActive) {
    const element = getElement()
    if (!element) {
      return
    }
    emit('help', element)
  }

  helpTimeout = window.setTimeout(() => {
    const element = getElement()
    if (!element) {
      return
    }
    emit('startHelp', element)
  }, 800)
}

function onMouseLeave() {
  if (helpTimeout) {
    window.clearTimeout(helpTimeout)
    helpTimeout = null
  }
}

defineExpose({ getElement })
</script>
