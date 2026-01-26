<template>
  <div class="bk-add-list-help-item">
    <div v-if="imageUrl" class="bk-add-list-help-image">
      <img :src="imageUrl" />
    </div>
    <h2>
      <ItemIconBox :bundle :icon :color />
      <span>{{ title }}</span>
    </h2>

    <hr />

    <div v-if="text" class="bk-add-list-help-description" v-html="text" />

    <template v-if="fields.length">
      <hr />
      <div class="bk-add-list-help-label">
        {{ $t('allowedBlocks', 'Allowed Blocks') }}
      </div>
      <div
        v-for="field in fields"
        :key="field.name"
        class="bk-add-list-help-fields-item"
      >
        <ul>
          <li v-if="fields.length > 1" class="bk-is-field">
            {{ field.label }}
          </li>
          <li
            v-for="allowed in field.allowed"
            :key="field.name + allowed.bundle"
            class="bk-is-bundle"
          >
            <ItemIconBox :bundle="allowed.bundle" is-tiny />
            <span>{{ allowed.label }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AddAction } from '#blokkli/editor/types/actions'
import { ItemIconBox } from '#blokkli/editor/components'
import { itemEntityType } from '#blokkli-build/config'
import { computed, useBlokkli } from '#imports'
import { falsy } from '#blokkli/helpers'

const props = defineProps<{
  type: 'bundle' | 'action'
  id: string
  actions: AddAction[]
}>()

const { types, $t, definitions } = useBlokkli()

const bundleDefinition = computed(() => {
  if (props.type === 'bundle') {
    return types.getBlockBundleDefinition(props.id)
  }
  return undefined
})

const action = computed(() => {
  if (props.type === 'action') {
    return props.actions.find((v) => v.id === props.id)
  }
  return undefined
})

const title = computed(() => {
  return bundleDefinition.value?.label ?? action.value?.title ?? ''
})

const text = computed(() => {
  return bundleDefinition.value?.description ?? action.value?.description
})

const imageUrl = computed(() => {
  if (bundle.value) {
    const imagePath = definitions.getBlockImage(bundle.value)
    if (imagePath) {
      return imagePath
    }
  }

  // Fall back to backend provided image if available.
  return bundleDefinition.value?.imageUrl
})

const bundle = computed(() => {
  return bundleDefinition.value?.id
})

const icon = computed(() => {
  return action.value?.icon
})

const color = computed(() => {
  return action.value?.color
})

type FieldInfo = {
  name: string
  label: string
  allowed: { bundle: string; label: string }[]
}

const fields = computed<FieldInfo[]>(() => {
  if (props.type !== 'bundle') {
    return []
  }

  const fieldConfigs = types.fieldConfig.forEntityTypeAndBundle(
    itemEntityType,
    props.id,
  )

  return fieldConfigs.map((field) => {
    const allowed = field.allowedBundles
      .map((bundleId) => {
        return types.getBlockBundleDefinition(bundleId)
      })
      .filter(falsy)
      .map((block) => {
        return {
          bundle: block.id,
          label: block.label,
        }
      })

    return {
      name: field.name,
      label: field.label,
      allowed,
    }
  })
})
</script>
