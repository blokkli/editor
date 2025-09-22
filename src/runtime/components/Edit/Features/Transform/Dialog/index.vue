<template>
  <DialogModal
    :title
    :can-submit
    :width="500"
    :lead
    icon="script"
    :submit-label="$t('transformDialogSubmitLabel', 'Apply transform')"
    @cancel="$emit('cancel')"
    @submit="onSubmit"
  >
    <div class="bk">
      <ConfigForm v-model="value" :config />
    </div>
  </DialogModal>
</template>

<script setup lang="ts">
import type { PluginConfigInput } from '#blokkli/types'
import { useBlokkli, ref, computed } from '#imports'
import { DialogModal, ConfigForm } from '#blokkli/components'

const props = defineProps<{
  title: string
  lead?: string
  config: PluginConfigInput[]
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'submit', values: Record<string, any>): void
}>()

const { $t } = useBlokkli()

const value = ref<Record<string, any>>({})

const requiredItems = computed<string[]>(() =>
  props.config.filter((v) => v.required).map((v) => v.name),
)

const canSubmit = computed<boolean>(() => {
  return requiredItems.value.every((name) => !!value.value[name])
})

function onSubmit() {
  emit('submit', value.value)
}
</script>
