<template>
  <div
    id="bk-blokkli-item-actions-title"
    class="w-[160px] lg:w-[240px]"
    :style="{
      height: 'var(--bk-actions-height)',
    }"
  >
    <button
      class="bk-blokkli-item-actions-type-button bk-item-icon-hover-parent group/tooltip pl-10 pr-3 flex items-center lg:min-w-[180px] text-mono-300 font-bold h-full leading-none relative w-full cursor-pointer hover:text-mono-50 hover:bg-mono-700"
      tabindex="-1"
      :class="{
        'lg:bg-mono-700 text-white': showDropdown,
      }"
      @click.prevent="showDropdown = !showDropdown"
    >
      <Tooltip
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
        v-show="!hasSelectedHost && bundleIcon"
        class="text-xl lg:text-[34px] mr-[0.25em] size-[1em] relative shrink-0"
      >
        <ItemIconBox
          v-if="bundleIcon"
          :icon="iconOverride"
          :bundle="bundleIcon"
          :color="isReusable ? 'lime' : undefined"
          is-small
        />
        <div
          v-if="itemBundle?.id === fromLibraryBlockBundle"
          class="absolute z-50 -top-[7px] -right-[7px] bg-lime-dark size-20 flex items-center justify-center rounded-full border border-lime-normal shadow-lg"
        >
          <Icon name="reusable" class="size-[12px] fill-lime-light" />
        </div>
      </div>
      <span class="truncate mr-auto">{{ title }}</span>
      <Pill
        v-if="selection.items.value.length > 1"
        :text="selection.items.value.length"
        scheme="mono"
      />

      <span
        v-show="isPermissionRestricted"
        class="size-25 text-yellow-normal p-5 bg-yellow-dark rounded-full"
      >
        <Icon name="bk_mdi_lock" class="size-full" />
      </span>

      <Pill
        v-show="selectedIsNew"
        :text="$t('selectedIsNew', 'New')"
        variant="light"
      />

      <Pill
        v-show="selectedTranslationIsOutdated"
        :text="$t('selectedTranslationIsOutdated', 'Outdated')"
        variant="light"
        scheme="yellow"
      />

      <Icon
        name="bk_mdi_arrow_drop_down"
        class="ml-2 pointer-events-none size-15 md:size-20"
        :class="{
          'rotate-180': showDropdown,
        }"
      />
    </button>
    <div
      v-if="editingEnabled"
      v-show="showDropdown"
      id="bk-blokkli-item-actions-dropdown"
      class="absolute bottom-full left-0 min-w-[300px] bg-mono-900 text-mono-200 shadow-xl-inverted w-screen lg:w-auto flex flex-col lg:top-full lg:bottom-auto lg:shadow-xl lg:left-[23px]"
    >
      <EditActionsItemDropdown
        v-if="showDropdown"
        @close="showDropdown = false"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { watch, computed, useBlokkli } from '#imports'
import { falsy } from '#blokkli/helpers'
import {
  Icon,
  ItemIconBox,
  Tooltip,
  TooltipStatus,
  Pill,
} from '#blokkli/editor/components'
import EditActionsItemDropdown from '../ItemDropdown/index.vue'
import type { FragmentDefinition } from '#blokkli-build/definitions'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { onBlokkliEvent } from '#blokkli/editor/composables'
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

const showDropdown = computed({
  get() {
    return ui.itemActionsOpen.value
  },
  set(isOpen: boolean) {
    ui.itemActionsOpen.value = isOpen
  },
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
  name: 'ItemActionsTitle',
}
</script>
