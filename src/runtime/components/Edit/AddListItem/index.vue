<template>
  <PluginContextMenu
    :id="'add_list_item_' + id"
    ref="el"
    tag="button"
    class="bk-list-item"
    data-element-type="action"
    :menu="menu"
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
        <Icon v-if="icon" :name="icon" />
        <ItemIcon v-else-if="bundle" :bundle="bundle" />
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
  </PluginContextMenu>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli/icons'
import type { AddListOrientation, ContextMenu } from '#blokkli/types'
import { useBlokkli, computed, ref } from '#imports'
import { ItemIcon, Icon } from '#blokkli/components'
import { PluginContextMenu } from '#blokkli/plugins'

const { ui, storage, $t } = useBlokkli()

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    orientation: AddListOrientation
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

const isDark = computed(
  () => props.orientation !== 'sidebar' && props.color === 'default',
)

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
