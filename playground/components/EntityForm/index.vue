<template>
  <form @submit.prevent.stop="onSubmit" class="entity-form">
    <div v-for="field in fields" :key="field.name" class="field">
      <label class="field-label" :for="field.name">{{ field.label }}</label>
      <input
        v-if="field.type === 'text'"
        :id="field.name"
        v-model="values[field.name]"
        type="text"
        :name="field.name"
      />
      <input
        v-else-if="field.type === 'url'"
        :id="field.name"
        v-model="values[field.name]"
        type="text"
        pattern="(https?|/).*?"
        :name="field.name"
      />
      <RichText
        v-else-if="field.type === 'textarea'"
        v-model="values[field.name]"
      />
      <FieldIconInput
        v-else-if="field.type === 'icon'"
        v-model="values[field.name]"
      />
      <MediaSelector
        v-else-if="field.type === 'media'"
        v-model="values[field.name]"
        v-bind="field.props"
      />
    </div>
    <div class="entity-form-footer">
      <input type="submit" value="Submit" />
    </div>
  </form>
</template>

<script lang="ts" setup>
import { falsy } from '#blokkli/helpers'
import { Field } from '~/app/mock/state/Field'
import { FieldIcon } from '~/app/mock/state/Field/Icon'
import { FieldText } from '~/app/mock/state/Field/Text'
import { FieldTextarea } from '~/app/mock/state/Field/Textarea'
import { FieldUrl } from '~/app/mock/state/Field/Url'
import FieldIconInput from './FieldIcon/index.vue'
import MediaSelector from './MediaSelector/index.vue'
import RichText from './RichText/index.vue'
import { FieldReference } from '~/app/mock/state/Field/Reference'

const props = defineProps<{
  fields: Field<any>[]
}>()

const emit = defineEmits<{
  (e: 'submit', values: Record<string, string>): void
}>()

type FormField = {
  type: 'text' | 'textarea' | 'url' | 'icon' | 'media'
  name: string
  label: string
  value: string
  props?: any
}

const mapField = (field: Field<unknown>): FormField | undefined => {
  if (field instanceof FieldText) {
    return {
      type: 'text',
      name: field.id,
      label: field.label,
      value: field.list[0] || '',
    }
  } else if (field instanceof FieldTextarea) {
    return {
      type: 'textarea',
      name: field.id,
      label: field.label,
      value: field.list[0] || '',
    }
  } else if (field instanceof FieldUrl) {
    return {
      type: 'url',
      name: field.id,
      label: field.label,
      value: field.list[0] || '',
    }
  } else if (field instanceof FieldIcon) {
    return {
      type: 'icon',
      name: field.id,
      label: field.label,
      value: field.list[0] || '',
    }
  } else if (field instanceof FieldReference) {
    if (field.targetEntityType === 'media') {
      return {
        type: 'media',
        name: field.id,
        label: field.label,
        value: field.list[0] || '',
        props: {
          bundles: field.allowedBundles,
        },
      }
    }
  }
}

const fields = computed<FormField[]>(() =>
  Object.values(props.fields).map(mapField).filter(falsy),
)

const values = ref<Record<string, string>>(
  fields.value.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = field.value
    return acc
  }, {}),
)

const onSubmit = () => {
  emit('submit', values.value)
}
</script>
