<template>
  <Teleport to="#bk-blokkli-item-actions-title">
    <div class="bk-blokkli-item-actions-type">
      <button
        class="bk-blokkli-item-actions-type-button"
        @click.prevent="showConversions = !showConversions"
        :disabled="!possibleConversions.length || !editingEnabled"
        :class="{
          'is-interactive': possibleConversions.length,
          'is-open': showConversions,
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
        <Icon
          name="caret"
          class="bk-caret"
          v-if="possibleConversions.length && editingEnabled"
        />
      </button>
    </div>
  </Teleport>
  <Teleport to="#bk-blokkli-item-actions-after">
    <div
      v-if="possibleConversions.length && showConversions"
      class="bk-blokkli-item-actions-type-dropdown"
    >
      <div>
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
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/components'
import { ItemIcon } from '#blokkli/components'
import { falsy, onlyUnique } from '#blokkli/helpers'
import type { BlokkliItemType } from '#blokkli/types'

const showConversions = ref(false)

const { adapter, types, selection, state, text } = useBlokkli()

const { data: conversionsData } = await useLazyAsyncData(() =>
  adapter.getConversions(),
)

const conversions = computed(() => conversionsData.value || [])

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

const editingEnabled = computed(() => state.editMode.value === 'editing')

const itemBundleIds = computed(() => {
  return selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique)
})

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
  showConversions.value = false
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
</script>
