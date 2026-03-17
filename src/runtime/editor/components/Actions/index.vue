<template>
  <div
    ref="el"
    :style="{
      visibility: isVisible ? 'visible' : 'hidden',
    }"
    class="bk bk-blokkli-item-actions-inner"
    @mouseleave="onMouseLeave"
    @mouseenter="onMouseEnter"
  >
    <div
      id="bk-blokkli-item-actions-controls"
      ref="controlsEl"
      class="bk-blokkli-item-actions-controls"
      :class="{
        'bk-is-locked': ui.isTransforming.value,
      }"
    >
      <Interactions />
      <div id="bk-blokkli-item-actions-title">
        <button
          class="bk-blokkli-item-actions-type-button bk-item-icon-hover-parent"
          tabindex="-1"
          :disabled="!shouldRenderButton"
          :class="{
            'is-open': showDropdown,
            'is-interactive': shouldRenderButton,
          }"
          @click.prevent="showDropdown = !showDropdown"
        >
          <div v-if="shouldRenderButton" class="bk-tooltip">
            <span>{{ $t('actionsDropdownToolip', 'Further actions') }}</span>
            <div
              v-if="restrictedPermissionsLabel"
              class="bk-item-action-disabled-reason"
            >
              <span>{{ restrictedPermissionsLabel }}</span>
            </div>
          </div>
          <div
            v-show="!hasSelectedHost"
            class="bk-blokkli-item-actions-title-icon"
          >
            <Icon v-if="ui.isTransforming.value" name="loader" />
            <ItemIconBox
              v-else-if="bundleIcon"
              :icon="iconOverride"
              :bundle="bundleIcon"
              :color="isReusable ? 'lime' : undefined"
              is-small
            />
            <Icon v-else name="bk_mdi_select_all" />
            <div
              v-if="itemBundle?.id === fromLibraryBlockBundle"
              class="bk-blokkli-item-actions-title-icon-reusable"
            >
              <Icon name="reusable" />
            </div>
          </div>
          <span class="bk-blokkli-item-actions-title-label">{{ title }}</span>
          <span
            v-if="selection.items.value.length > 1"
            class="bk-blokkli-item-actions-title-count"
            >{{ selection.items.value.length }}</span
          >

          <span
            v-show="isPermissionRestricted"
            class="bk-blokkli-item-actions-title-pill bk-is-restricted"
          >
            <Icon name="bk_mdi_lock" />
          </span>

          <span
            v-show="selectedIsNew"
            class="bk-blokkli-item-actions-title-pill"
            >{{ $t('selectedIsNew', 'New') }}</span
          >
          <Icon
            v-if="shouldRenderButton"
            name="bk_mdi_arrow_drop_down"
            class="bk-caret"
          />
        </button>
        <EditActionsItemDropdown
          v-if="showDropdown && editingEnabled"
          @close="showDropdown = false"
        />
      </div>

      <div
        v-show="!selection.hasHostSelected.value && !ui.isTransforming.value"
        id="bk-blokkli-item-actions"
        class="bk-blokkli-item-actions-buttons"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  computed,
  useBlokkli,
  useTemplateRef,
  onBeforeUnmount,
} from '#imports'
import { falsy } from '#blokkli/helpers'
import { Icon, ItemIconBox } from '#blokkli/editor/components'
import EditActionsItemDropdown from './ItemDropdown.vue'
import Interactions from './Interactions/index.vue'
import type { FragmentDefinition } from '#blokkli-build/definitions'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { onBlokkliEvent, useStickyToolbar } from '#blokkli/editor/composables'
import {
  fragmentBlockBundle,
  fromLibraryBlockBundle,
} from '#blokkli-build/config'
import type { BlockPermission } from '#blokkli/editor/types/definitions'

const { selection, $t, types, state, ui, definitions, debug, permissions } =
  useBlokkli()

const editingEnabled = computed(
  () =>
    state.editMode.value === 'editing' ||
    state.editMode.value === 'translating',
)

const ACTIONS_HEIGHT = 52

const el = useTemplateRef('el')

useStickyToolbar(el, {
  getPlacementY: () => 'top',
  shouldUpdate: () => !ui.actionsToolbarLocked.value && isVisible.value,
  getHeight: () => ACTIONS_HEIGHT,
  getMargin: () => 20,
  allowHorizontalOverflow: true,
})

let mouseLeaveTimeout: number | null = null

function onMouseLeave() {
  onMouseEnter()
  if (ui.actionsToolbarLocked.value || ui.isChangingOptions.value) {
    mouseLeaveTimeout = window.setTimeout(() => {
      ui.actionsToolbarLocked.value = false
      ui.isChangingOptions.value = false
    }, 500)
  }
}

function onMouseEnter() {
  if (mouseLeaveTimeout) {
    window.clearTimeout(mouseLeaveTimeout)
    mouseLeaveTimeout = null
  }
}

onBeforeUnmount(() => {
  if (mouseLeaveTimeout) {
    window.clearTimeout(mouseLeaveTimeout)
  }
})

const showDropdown = ref(false)

const hasAnythingSelected = computed(
  () => selection.hasHostSelected.value || !!selection.items.value.length,
)

const isVisible = computed<boolean>(() => {
  return (
    !selection.isDragging.value &&
    !selection.activeEditableLabel.value &&
    !ui.isAnimating.value &&
    !ui.hasTransformOverlayOpen.value &&
    hasAnythingSelected.value &&
    !ui.hasTooltipOpen.value &&
    !ui.isApproving.value
  )
})

watch(selection.items, () => {
  showDropdown.value = false
})

watch(selection.hasHostSelected, () => {
  showDropdown.value = false
})

const bundleIcon = computed(() => {
  if (itemBundle.value?.id === fromLibraryBlockBundle) {
    const reusableBundle = selection.items.value[0]?.library?.reusableBundle
    if (reusableBundle) {
      return reusableBundle
    }
  }

  return itemBundle.value?.id
})

const iconOverride = computed<BlokkliIcon | null>(() => {
  if (fragment.value) {
    return fragment.value.editor?.icon ?? null
  }

  return null
})

const isReusable = computed(() => {
  return itemBundle.value?.id === fromLibraryBlockBundle
})

const hasSelectedHost = computed(() => {
  return selection.items.value.length === 0
})

const fragment = computed<FragmentDefinition | null>(() => {
  if (itemBundle.value?.id !== fragmentBlockBundle) {
    return null
  }
  const uuid = selection.uuids.value[0]
  if (!uuid) {
    return null
  }
  const item = state.getFieldListItem(uuid)
  if (!item) {
    return null
  }
  const name = item.props?.name
  if (!name) {
    return null
  }
  return definitions.getFragmentDefinition(name) ?? null
})

const title = computed(() => {
  if (ui.transformLabel.value) {
    return ui.transformLabel.value
  } else if (debug.isEnabled.value && selection.uuids.value.length === 1) {
    return selection.uuids.value[0]
  } else if (itemBundle.value) {
    if (itemBundle.value.id === fragmentBlockBundle) {
      const fragments = selection.uuids.value
        .map((uuid) => {
          const item = state.getFieldListItem(uuid)
          if (!item) {
            return
          }
          const name = item.props?.name
          if (!name) {
            return
          }
          const definition = definitions.getFragmentDefinition(name)
          return definition?.label
        })
        .filter(falsy)

      if (fragments.length && fragments.length < 3) {
        return fragments.join(', ')
      }
    } else if (itemBundle.value.id === fromLibraryBlockBundle) {
      const title = selection.items.value[0]?.library?.label
      if (title) {
        return title
      }
    }
    return itemBundle.value.label
  } else if (!selection.items.value.length) {
    return state.entity.value.label
  }

  return $t('multipleItemsLabel', 'Items')
})

const selectedIsNew = computed<boolean>(() => {
  const items = selection.items.value
  return !!items.length && items.every((v) => v.isNew)
})

const permissionsForSelected = computed<BlockPermission[]>(() => {
  const bundles = selection.bundles.value
  if (!bundles.length) {
    return []
  }

  const allPermissions: BlockPermission[] = ['add', 'delete', 'edit']
  return allPermissions.filter((permission) =>
    bundles.every((bundle) =>
      permissions.checkBlockBundlePermission(bundle, permission),
    ),
  )
})

const isPermissionRestricted = computed(
  () =>
    selection.items.value.length > 0 && permissionsForSelected.value.length < 3,
)

const restrictedPermissionsLabel = computed(() => {
  if (!isPermissionRestricted.value) {
    return null
  }
  const shared = permissionsForSelected.value
  if (shared.length === 0) {
    return $t(
      'restrictedPermissionsAll',
      'Some actions are not available due to missing permissions.',
    )
  }
  return $t(
    'restrictedPermissionsSome',
    'Some actions are restricted due to missing permissions.',
  )
})

const itemBundle = computed(() => {
  if (selection.bundles.value.length !== 1) {
    return
  }
  const bundle = selection.bundles.value[0]!
  return types.getBlockBundleDefinition(bundle)
})

const shouldRenderButton = computed<boolean>(() => true)

onBlokkliEvent('action:selected', () => {
  showDropdown.value = false
})

watch(ui.isTransforming, function (isTransforming) {
  if (isTransforming) {
    showDropdown.value = false
  }
})
</script>

<script lang="ts">
export default {
  name: 'ItemActions',
}
</script>
