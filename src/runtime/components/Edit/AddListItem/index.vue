<template>
  <PluginContextMenu
    :id="'add_list_item_' + context + id"
    ref="el"
    tag="button"
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
import type { ContextMenu } from '#blokkli/types'
import { useBlokkli, computed, ref } from '#imports'
import { ItemIconBox } from '#blokkli/components'
import { PluginContextMenu } from '#blokkli/plugins'

const { storage, $t } = useBlokkli()

const props = withDefaults(
  defineProps<{
    id: string
    context: string
    label: string
    color?: 'rose' | 'lime' | 'default' | 'yellow' | 'accent'
    bundle?: string
    icon?: BlokkliIcon
    disabled?: boolean
    noContextMenu?: boolean
  }>(),
  {
    color: 'default',
    bundle: '',
    icon: undefined,
  },
)

const el = ref<InstanceType<typeof PluginContextMenu> | null>(null)

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

<script lang="ts">
export default {
  name: 'AddListItem',
}
</script>
