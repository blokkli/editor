<template>
  <PluginContextMenu
    :id="'add_list_item_' + context + id"
    ref="pluginContextMenu"
    tag="button"
    type="button"
    class="bk-add-item"
    :menu="menu"
    :data-sortli-id="id"
    :class="[
      {
        'bk-is-disabled': disabled,
      },
      'bk-is-' + color,
    ]"
  >
    <div class="bk-add-item-icon">
      <ItemIconBox :color :bundle :icon />
    </div>
    <div class="bk-add-item-label">
      <span>{{ label }}</span>
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
  color?: 'rose' | 'lime' | 'default' | 'yellow' | 'accent' | 'orange'
  bundle?: string
  icon?: BlokkliIcon
  disabled?: boolean
  noContextMenu?: boolean
}

const props = withDefaults(defineProps<AddListItemProps>(), {
  color: 'default',
  bundle: '',
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

defineExpose({ getElement })
</script>
