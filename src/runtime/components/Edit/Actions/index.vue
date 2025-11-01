<template>
  <Teleport to="body">
    <div class="bk bk-blokkli-item-actions bk-control" @click.stop>
      <div
        v-show="
          !selection.isDragging.value &&
          !selection.editableActive.value &&
          !ui.isAnimating.value &&
          !ui.hasTransformOverlayOpen.value &&
          hasAnythingSelected &&
          shouldRender &&
          !ui.hasTooltipOpen.value
        "
        ref="el"
        class="bk-blokkli-item-actions-inner"
      >
        <div
          id="bk-blokkli-item-actions-controls"
          ref="controlsEl"
          class="bk-blokkli-item-actions-controls"
          :class="{
            'bk-is-locked': ui.isTransforming.value,
          }"
        >
          <div id="bk-blokkli-item-actions-title">
            <button
              class="bk-blokkli-item-actions-type-button"
              :disabled="!shouldRenderButton"
              :class="{
                'is-open': showDropdown,
                'is-interactive': shouldRenderButton,
                'bk-is-reusable': itemBundle?.id === 'from_library',
                'bk-is-fragment': itemBundle?.id === 'blokkli_fragment',
              }"
              @click.prevent="showDropdown = !showDropdown"
            >
              <div v-if="shouldRenderButton" class="bk-tooltip">
                {{ $t('actionsDropdownToolip', 'Further actions') }}
              </div>
              <div
                v-show="!hasSelectedHost"
                class="bk-blokkli-item-actions-title-icon"
              >
                <Icon v-if="ui.isTransforming.value" name="loader" />
                <ItemIcon v-else-if="bundleIcon" :bundle="bundleIcon" />
                <Icon v-else name="selection" />
                <div
                  v-if="itemBundle?.id === 'from_library'"
                  class="bk-blokkli-item-actions-title-icon-reusable"
                >
                  <Icon name="reusable" />
                </div>
              </div>
              <span class="bk-blokkli-item-actions-title-label">{{
                title
              }}</span>
              <span
                v-if="selection.items.value.length > 1"
                class="bk-blokkli-item-actions-title-count"
                >{{ selection.items.value.length }}</span
              >
              <span
                v-show="selectedIsNew"
                class="bk-blokkli-item-actions-title-pill"
                >{{ $t('selectedIsNew', 'New') }}</span
              >
              <Icon v-if="shouldRenderButton" name="caret" class="bk-caret" />
            </button>
            <EditActionsItemDropdown
              v-if="showDropdown && editingEnabled"
              @close="showDropdown = false"
            />
          </div>

          <div
            v-show="!selection.hasHostSelected.value"
            id="bk-blokkli-item-actions"
            class="bk-blokkli-item-actions-buttons"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { watch, ref, computed, useBlokkli, useTemplateRef } from '#imports'
import { falsy } from '#blokkli/helpers'
import { ItemIcon, Icon } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import useStickyToolbar from '#blokkli/helpers/composables/useStickyToolbar'
import EditActionsItemDropdown from './ItemDropdown.vue'

const { selection, $t, types, state, ui, definitions, debug } = useBlokkli()

const editingEnabled = computed(
  () =>
    state.editMode.value === 'editing' ||
    state.editMode.value === 'translating',
)

const ACTIONS_HEIGHT = 52

const el = useTemplateRef('el')

const { shouldRender } = useStickyToolbar(el, {
  getPlacementY: () => 'top',
  shouldUpdate: () => !selection.isChangingOptions.value,
  getHeight: () => ACTIONS_HEIGHT,
  getMargin: () => 20,
  allowHorizontalOverflow: true,
})

const controlsEl = ref<HTMLElement | null>(null)
const showDropdown = ref(false)

const hasAnythingSelected = computed(
  () => selection.hasHostSelected.value || !!selection.items.value.length,
)

watch(selection.items, () => {
  showDropdown.value = false
})

watch(selection.hasHostSelected, () => {
  showDropdown.value = false
})

const bundleIcon = computed(() => {
  if (itemBundle.value?.id === 'from_library') {
    const reusableBundle = selection.items.value[0]?.library?.reusableBundle
    if (reusableBundle) {
      return reusableBundle
    }
  }

  return itemBundle.value?.id
})

const hasSelectedHost = computed(() => {
  return selection.items.value.length === 0
})

const title = computed(() => {
  if (ui.transformLabel.value) {
    return ui.transformLabel.value
  } else if (debug.isEnabled.value && selection.uuids.value.length === 1) {
    return selection.uuids.value[0]
  } else if (itemBundle.value) {
    if (itemBundle.value.id === 'blokkli_fragment') {
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
    } else if (itemBundle.value.id === 'from_library') {
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
  if (selection.uuids.value.length !== 1) {
    return false
  }

  const uuid = selection.uuids.value[0]
  if (!uuid) {
    return false
  }

  return !!state.getFieldListItem(uuid)?.editContext?.isNew
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
