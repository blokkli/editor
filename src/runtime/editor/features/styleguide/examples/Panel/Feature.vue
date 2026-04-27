<template>
  <PanelItem
    :title="feature.label"
    :description="feature.type"
    :icon="icon"
    :muted="editingId !== null && !isEditing"
    :active="isEditing"
    @click="onItemClick"
  >
    <template #actions>
      <ButtonAction
        label="Delete"
        icon="bk_mdi_delete"
        theme="danger"
        @click="$emit('delete')"
      />
    </template>
    <TransitionCollapse>
      <form
        v-if="isEditing"
        @submit.prevent="save"
        @keydown.escape="$emit('cancel')"
      >
        <div class="px-15 pb-15">
          <FormText
            :id="`feature-${feature.id}-label`"
            v-model="draft"
            label="Label"
          />
          <div class="flex gap-8 mt-20">
            <button
              type="submit"
              class="bk-button bk-scheme-accent bk-is-small"
            >
              Save
            </button>
            <button
              type="button"
              class="bk-button bk-scheme-mono bk-is-light bk-is-small"
              @click="$emit('cancel')"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </TransitionCollapse>
  </PanelItem>
</template>

<script setup lang="ts">
import { computed, ref, watch } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import ButtonAction from '#blokkli/editor/components/ButtonAction/index.vue'
import FormText from '#blokkli/editor/components/Form/Text/index.vue'
import PanelItem from '#blokkli/editor/components/Panel/Item/index.vue'
import TransitionCollapse from '#blokkli/editor/components/Transition/Collapse/index.vue'

interface Feature {
  id: number
  type: string
  label: string
}

const props = defineProps<{
  feature: Feature
  icon: BlokkliIcon
  editingId: number | null
}>()

const emit = defineEmits<{
  (e: 'edit' | 'delete' | 'cancel'): void
  (e: 'save', label: string): void
}>()

const isEditing = computed(() => props.editingId === props.feature.id)

const draft = ref(props.feature.label)

watch(isEditing, async (isEditing) => {
  if (isEditing) {
    draft.value = props.feature.label
  }
})

function save() {
  const trimmed = draft.value.trim()
  if (!trimmed) return
  emit('save', trimmed)
}

function onItemClick() {
  if (isEditing.value) {
    save()
  } else {
    emit('edit')
  }
}
</script>
