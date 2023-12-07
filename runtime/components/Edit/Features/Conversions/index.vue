<template>
  <Teleport to="#bk-blokkli-item-actions-title">
    <div class="bk-blokkli-item-actions-type">
      <button
        class="bk-blokkli-item-actions-type-button"
        @click.prevent="showDropdown = !showDropdown"
        :disabled="!shouldRenderDropdown"
        :class="{
          'is-interactive': shouldRenderDropdown,
          'is-open': showDropdown,
        }"
      >
        <div class="bk-blokkli-item-actions-title-icon">
          <ItemIcon v-if="itemBundle" :bundle="itemBundle.id" />
          <Icon name="selection" v-else />
        </div>
        <span>{{ title }}</span>
        <span
          class="bk-blokkli-item-actions-title-count"
          :class="{ 'bk-is-hidden': selection.blocks.value.length <= 1 }"
          >{{ selection.blocks.value.length }}</span
        >
        <Icon name="caret" class="bk-caret" v-if="shouldRenderDropdown" />
      </button>
    </div>
  </Teleport>
  <Teleport to="#bk-blokkli-item-actions-after">
    <div
      v-if="shouldRenderDropdown && showDropdown"
      class="bk-blokkli-item-actions-type-dropdown"
    >
      <div v-if="possibleConversions.length">
        <h3>{{ text('convertTo') }}</h3>
        <button
          @click.prevent="onConvert(conversion.id)"
          v-for="conversion in possibleConversions"
        >
          <ItemIcon :bundle="conversion.id" />
          <div>
            <div>{{ conversion.label }}</div>
          </div>
        </button>
      </div>
      <div v-if="possibleTransforms.length">
        <h3>{{ text('transformTo') }}</h3>
        <button
          v-for="transform in possibleTransforms"
          @click.prevent="onTransform(transform)"
        >
          <div>
            <div>{{ transform.label }}</div>
          </div>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/components'
import { ItemIcon } from '#blokkli/components'
import { falsy, onlyUnique } from '#blokkli/helpers'
import type { BlokkliItemType, BlokkliTransformPlugin } from '#blokkli/types'

const showDropdown = ref(false)

const { adapter, types, selection, state, text } = useBlokkli()

const { data: conversionsData } = await useLazyAsyncData(() => {
  if (adapter.getConversions) {
    return adapter.getConversions()
  }
  return Promise.resolve([])
})

const conversions = computed(() => conversionsData.value || [])

const { data: transformData } = await useLazyAsyncData(() => {
  if (adapter.getTransformPlugins) {
    return adapter.getTransformPlugins()
  }
  return Promise.resolve([])
})

const transforms = computed(() => transformData.value || [])

async function onConvert(targetBundle?: string) {
  if (!targetBundle) {
    return
  }

  await state.mutateWithLoadingState(
    adapter.convertItems(
      selection.blocks.value.map((v) => v.uuid),
      targetBundle,
    ),
    text('failedToConvert'),
  )
}

async function onTransform(plugin: BlokkliTransformPlugin) {
  await state.mutateWithLoadingState(
    adapter.applyTransformPlugin({
      uuids: selection.blocks.value.map((v) => v.uuid),
      pluginId: plugin.id,
    }),
    text('failedToTransform').replace('@name', plugin.label),
  )
}

const editingEnabled = computed(() => state.editMode.value === 'editing')

const itemBundleIds = computed(() =>
  selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique),
)

const itemBundle = computed(() => {
  if (itemBundleIds.value.length !== 1) {
    return
  }
  return itemBundleIds.value
    ? types.allTypes.value.find((v) => v.id === itemBundleIds.value[0])
    : undefined
})

const title = computed(() => {
  if (itemBundle.value) {
    return itemBundle.value.label
  }

  return text('multipleItemsLabel')
})

watch(selection.blocks, () => {
  showDropdown.value = false
})

const possibleConversions = computed<BlokkliItemType[]>(() => {
  if (itemBundleIds.value.length !== 1) {
    return []
  }
  const sourceType = itemBundleIds.value[0]
  return conversions.value
    .filter(
      (v) =>
        v.sourceBundle === sourceType &&
        types.allowedTypesInList.value.includes(v.targetBundle),
    )
    .map((v) => types.allTypes.value.find((t) => t.id === v.targetBundle))
    .filter(falsy)
})

const possibleTransforms = computed<BlokkliTransformPlugin[]>(() => {
  return transforms.value.filter((plugin) => {
    if (selection.uuids.value.length < plugin.min) {
      return false
    }

    if (plugin.max !== -1 && selection.uuids.value.length > plugin.max) {
      return false
    }

    // Filter for supported bundles.
    return itemBundleIds.value.every((bundle) =>
      plugin.bundles.includes(bundle),
    )
  })
})

const shouldRenderDropdown = computed(
  () =>
    !!(possibleTransforms.value.length || possibleConversions.value.length) &&
    editingEnabled.value,
)
</script>
