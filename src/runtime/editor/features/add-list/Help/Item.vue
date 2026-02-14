<template>
  <div
    ref="el"
    class="bk-add-list-help-item"
    :style="{
      visibility: isVisible ? 'visible' : 'hidden',
    }"
  >
    <div v-if="type === 'bundle'" class="bk-add-list-help-image">
      <img v-if="imageUrl" :src="imageUrl" />
      <div v-else>
        <ItemIcon :bundle="undefined" :icon />
      </div>
    </div>
    <h2>
      <ItemIconBox :bundle :icon :color />
      <span>{{ title }}</span>
    </h2>

    <hr />

    <div v-if="text" class="bk-add-list-help-description" v-html="text" />

    <template v-for="section in sections" :key="section.title">
      <hr />
      <div class="bk-add-list-help-label">
        {{ section.title }}
      </div>
      <div
        v-for="field in section.fields"
        :key="field.name"
        class="bk-add-list-help-fields-item"
      >
        <ul>
          <li v-if="section.fields.length > 1" class="bk-is-field">
            {{ field.label }}
          </li>
          <li
            v-for="allowed in field.items"
            :key="field.name + allowed.bundle"
            class="bk-is-bundle"
          >
            <ItemIconBox
              :bundle="allowed.bundle"
              :icon="allowed.icon"
              is-tiny
            />
            <span>{{ allowed.label }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AddAction } from '#blokkli/editor/types/actions'
import { ItemIconBox, ItemIcon } from '#blokkli/editor/components'
import { itemEntityType, fragmentBlockBundle } from '#blokkli-build/config'
import { computed, ref, useBlokkli, useTemplateRef } from '#imports'
import { onElementResize } from '#blokkli/editor/composables'
import { falsy } from '#blokkli/helpers'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'

const props = defineProps<{
  type: 'bundle' | 'action'
  id: string
  actions: AddAction[]
  isVisible: boolean
}>()

const el = useTemplateRef('el')
const height = ref(0)

onElementResize(el, (size) => {
  height.value = size.height
})

defineExpose({
  height,
})

const { types, $t, definitions, dom } = useBlokkli()

const reusableBlockTypes = computed(() =>
  types.generallyAvailableBundles.filter((v) => v.allowReusable),
)

const fragments = computed<FieldInfoItem[]>(() => {
  const available = dom.generallyAvailableFragments.value
  return definitions.fragmentDefinitions.value
    .filter((definition) => {
      return available.includes(definition.name as BlokkliFragmentName)
    })
    .map((v) => {
      return {
        bundle: fragmentBlockBundle,
        label: v.label,
        icon: v.editor?.icon ?? 'bk_mdi_newspaper',
      }
    })
})

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

type FieldInfoItem = {
  bundle: string
  label: string
  icon?: BlokkliIcon
}

type FieldInfo = {
  name: string
  label: string
  items: FieldInfoItem[]
}

type Section = {
  title: string
  fields: FieldInfo[]
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
    const items = field.allowedBundles
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
      items,
    }
  })
})

const sections = computed<Section[]>(() => {
  const result: Section[] = []

  if (fields.value.length) {
    result.push({
      title: $t('allowedBlocks', 'Allowed Blocks'),
      fields: fields.value,
    })
  }

  if (
    props.type === 'action' &&
    props.id === 'library' &&
    reusableBlockTypes.value.length
  ) {
    result.push({
      title: $t('availableBlocks', 'Available blocks'),
      fields: [
        {
          name: 'reusable',
          label: '',
          items: reusableBlockTypes.value.map((block) => ({
            bundle: block.id,
            label: block.label,
          })),
        },
      ],
    })
  }

  if (props.type === 'action' && props.id === 'fragment' && fragments.value) {
    result.push({
      title: $t('availableFragments', 'Available fragments'),
      fields: [
        {
          name: 'fragments',
          label: '',
          items: fragments.value,
        },
      ],
    })
  }

  return result
})
</script>
