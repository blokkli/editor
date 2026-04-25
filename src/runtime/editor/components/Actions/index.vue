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
          class="bk-blokkli-item-actions-type-button bk-item-icon-hover-parent group/tooltip"
          tabindex="-1"
          :disabled="!shouldRenderButton"
          :class="{
            'is-open': showDropdown,
            'is-interactive': shouldRenderButton,
          }"
          @click.prevent="showDropdown = !showDropdown"
        >
          <Tooltip
            v-if="shouldRenderButton"
            :label="$t('actionsDropdownToolip', 'Further actions')"
            placement="above-left"
            class="w-full"
          >
            <template #status>
              <TooltipStatus
                v-if="restrictedPermissionsLabel"
                :description="restrictedPermissionsLabel"
                status="warning"
              />
              <TooltipStatus
                v-if="selectedTranslationIsOutdated"
                :description="
                  $t(
                    'translationOutdatedHint',
                    'The translation is marked as outdated.',
                  )
                "
                status="warning"
              />
            </template>
          </Tooltip>
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
            class="bk-blokkli-item-actions-title-pill bk-is-warning bk-is-restricted"
          >
            <Icon name="bk_mdi_lock" />
          </span>

          <span
            v-show="selectedIsNew"
            class="bk-blokkli-item-actions-title-pill"
            >{{ $t('selectedIsNew', 'New') }}</span
          >
          <span
            v-show="selectedTranslationIsOutdated"
            class="bk-blokkli-item-actions-title-pill bk-is-warning"
            >{{ $t('selectedTranslationIsOutdated', 'Outdated') }}</span
          >
          <Icon
            v-if="shouldRenderButton"
            name="bk_mdi_arrow_drop_down"
            class="bk-caret"
          />
        </button>
        <div
          v-if="editingEnabled"
          v-show="showDropdown"
          id="bk-blokkli-item-actions-dropdown"
          class="bk-blokkli-item-actions-type-dropdown"
        >
          <EditActionsItemDropdown
            v-if="showDropdown"
            @close="showDropdown = false"
          />
        </div>
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
  computed,
  useBlokkli,
  useTemplateRef,
  onBeforeUnmount,
} from '#imports'
import { falsy } from '#blokkli/helpers'
import {
  Icon,
  ItemIconBox,
  Tooltip,
  TooltipStatus,
} from '#blokkli/editor/components'
import EditActionsItemDropdown from './ItemDropdown/index.vue'
import Interactions from './Interactions/index.vue'
import type { FragmentDefinition } from '#blokkli-build/definitions'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { onBlokkliEvent, useStickyToolbar } from '#blokkli/editor/composables'
import {
  fragmentBlockBundle,
  fromLibraryBlockBundle,
} from '#blokkli-build/config'
import type { BlockPermission } from '#blokkli/editor/types/definitions'

const {
  selection,
  $t,
  types,
  state,
  ui,
  definitions,
  debug,
  permissions,
  context,
} = useBlokkli()

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
  getMargin: () => 30,
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

const showDropdown = computed({
  get() {
    return ui.itemActionsOpen.value
  },
  set(isOpen: boolean) {
    ui.itemActionsOpen.value = isOpen
  },
})

const hasAnythingSelected = computed(
  () => selection.hasHostSelected.value || !!selection.items.value.length,
)

const isVisible = computed<boolean>(() => {
  return (
    !selection.isDragging.value &&
    !selection.activeFieldLabel.value &&
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

const selectedTranslationIsOutdated = computed<boolean>(() => {
  const items = selection.items.value
  if (!items.length) return false
  return items.every((item) =>
    item.outdatedTranslations.includes(context.value.language),
  )
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

<style lang="postcss">
.bk {
  #bk-blokkli-item-actions-title {
    height: var(--bk-actions-height);
    @apply w-[160px] lg:w-[240px];
  }
  .bk-blokkli-item-actions-title-count {
    @apply bg-mono-50 text-mono-900 inline-flex items-center justify-center px-3 min-w-[1.5em] h-[1.5em] rounded-full ml-10 text-xs lg:text-sm font-bold leading-none;
    &.bk-is-hidden {
      @apply opacity-0;
    }
  }
  &.bk-blokkli-item-actions-inner {
    @apply absolute left-0 p-0 z-actions w-full text-mono-50  select-none text-sm pointer-events-auto;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    /* contain: layout style paint; */
    bottom: var(--bk-root-offset-bottom);
    @variant lg {
      @apply top-0 w-auto;
      bottom: initial;
    }
  }

  .bk-blokkli-item-actions-controls {
    @apply flex items-stretch whitespace-nowrap h-full flex-wrap lg:flex-nowrap;
    @apply bg-mono-950/90 backdrop-blur;
    @apply relative z-50;

    @apply lg:rounded-md;

    color-scheme: dark;

    &.bk-is-locked {
      @apply pointer-events-none;
      .bk-blokkli-item-actions-buttons > button,
      .bk-blokkli-item-options > .bk-blokkli-item-options-item {
        @apply opacity-20;
      }
    }

    html.bk-low-performance-mode & {
      @apply backdrop-filter-none;
    }

    &::-webkit-scrollbar {
      display: none;
    }
    @variant lg {
      @apply filter-none backdrop-filter-none;
      @apply border border-mono-400;
      @apply outline outline-1 outline-mono-700;
      @apply bg-mono-900;
    }
  }

  .bk-item-action {
    @apply text-mono-300 h-full flex items-center shrink-0  justify-center relative lg:static z-50;
    max-width: var(--bk-actions-height);
    flex: 1 0 auto;
    @variant lg {
      width: var(--bk-actions-height);
      flex: initial;
    }
    &.bk-is-active {
      @apply bg-white text-mono-900 z-50;
    }

    &:not([disabled]) {
      @apply lg:hover:bg-mono-700 lg:hover:text-mono-50;
    }

    &[disabled] {
      @apply cursor-not-allowed;
      .bk-item-action-icon {
        @apply opacity-25;
      }
    }
  }

  .bk-blokkli-item-actions-buttons {
    @apply relative flex flex-1 lg:flex-initial;
  }
  .bk-item-action-icon {
    @apply pointer-events-none;
    svg {
      @apply size-20 lg:size-24 fill-current;
    }
  }
  .bk-blokkli-item-actions-buttons:last-child button.bk-is-last {
    @apply lg:rounded-e-md;
  }

  .bk-blokkli-item-actions-title-icon,
  .bk-blokkli-item-actions-type-dropdown-icon {
    @apply text-xl lg:text-[34px] mr-[0.25em] size-[1em] relative;
    > .bk-blokkli-item-icon,
    > .bk-icon {
      svg {
        @apply w-[0.7em] h-[0.7em] fill-current absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2;
      }
    }
    .bk-blokkli-item-actions-title-icon-reusable {
      @apply absolute z-50;
      @apply -top-[7px] -right-[7px];
      @apply bg-lime-dark;
      @apply size-20;
      @apply flex items-center justify-center;
      @apply rounded-full;
      @apply border border-lime-normal;
      @apply shadow-lg;
      svg {
        @apply size-[12px] fill-lime-light;
      }
    }
  }
  .bk-blokkli-item-actions-type-button,
  .bk-blokkli-item-actions-type-dropdown-button {
    @apply pl-[9px] lg:pr-5;
  }

  .bk-blokkli-item-actions-type-button {
    @apply flex items-center cursor-default lg:min-w-[180px] text-mono-300 font-bold h-full leading-none relative;
    @apply text-xs lg:text-base;
    @apply w-full;
    @apply lg:rounded-l-md;
    .bk-blokkli-item-actions-title-label {
      @apply truncate mr-auto;
    }
    .bk-blokkli-item-actions-title-icon {
      flex: 0 0 auto;
    }

    &.is-interactive {
      @apply cursor-pointer;
      @media not all and (hover: none) {
        &:not(.is-open) {
          @apply hover:text-mono-50 hover:bg-mono-700;
        }
      }
    }
    &.is-open {
      @apply lg:bg-mono-700 text-white rounded-b-none;
      .bk-caret {
        @apply transform rotate-180;
      }
    }
    .bk-caret {
      @apply ml-2;
      svg {
        @apply pointer-events-none size-15 fill-current md:size-20;
      }
    }
  }

  #bk-blokkli-item-actions {
    @apply lg:border-l lg:border-l-mono-500 justify-end;
  }

  .bk-blokkli-item-actions-type {
    @apply relative h-full;
  }

  .bk-blokkli-item-actions-type-dropdown {
    @apply absolute bottom-full left-0 min-w-[300px] bg-mono-900 text-mono-200 shadow-xl-inverted lg:rounded-tr w-screen lg:w-auto flex flex-col;
    > div {
      @apply border-b border-b-mono-700;
    }
    @variant lg {
      @apply top-full bottom-auto shadow-xl rounded-t-none rounded-b left-[23px];
      @apply border-b-2 border-mono-400 border-l-2 border-r-2;
    }
    li {
      @apply relative;
    }
    h3 {
      @apply p-10 pt-15 font-semibold uppercase text-xs tracking-wide text-mono-400;
    }
    .bk-blokkli-item-actions-type-dropdown-button {
      .bk-blokkli-item-icon,
      .bk-icon {
        @apply flex items-center justify-center shrink-0;
        @apply size-25;
        svg {
          @apply fill-current;
        }
      }
    }
  }

  .bk-blokkli-item-actions-type-dropdown-button {
    @apply flex w-full font-semibold lg:text-base text-mono-300 items-center;
    text-align: left;
    line-height: 1;
    height: var(--bk-actions-height);
    &[disabled] {
      @apply pointer-events-none opacity-20;
    }
    @variant lg {
      &:hover {
        @apply text-white bg-mono-800;
        .bk-icon,
        .bk-blokkli-item-icon {
          @apply border-mono-300;
        }
        .bk-description {
          @apply text-white;
        }
      }
    }
  }

  .bk-blokkli-item-actions-comment {
    /* @apply relative; */
  }

  .bk-blokkli-item-actions-title-pill {
    font-size: 10px;
    @apply uppercase leading-none ml-5;
    @apply rounded-full px-5 h-20 flex items-center justify-center;
    @apply bg-accent-900/80 text-accent-100;
    @apply border border-accent-200/70 font-bold;
    @apply leading-none;

    &.bk-is-restricted {
      @apply p-0 size-20;

      svg {
        @apply size-[1.25em] fill-current;
      }
    }

    &.bk-is-warning {
      @apply bg-yellow-normal/20 text-yellow-normal border-yellow-normal/80;
    }
  }
}
</style>
