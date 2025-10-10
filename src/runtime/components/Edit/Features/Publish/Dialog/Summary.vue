<template>
  <div class="bk-publish-summary">
    <!-- Current State -->
    <div class="bk-publish-summary-state">
      <div class="bk-publish-summary-state-icon" :class="currentStateClass">
        <Icon :name="currentStateIcon" />
      </div>
      <div class="bk-publish-summary-state-label">
        {{ currentStateLabel }}
      </div>
    </div>

    <!-- Arrow -->
    <div class="bk-publish-summary-arrow">
      <Icon name="arrow-right" />
    </div>

    <!-- Action -->
    <div class="bk-publish-summary-action">
      <div class="bk-publish-summary-action-icon" :class="actionClass">
        <Icon :name="actionIcon" />
      </div>
      <div class="bk-publish-summary-action-label">
        {{ actionLabel }}
      </div>
    </div>

    <!-- Arrow -->
    <div class="bk-publish-summary-arrow">
      <Icon name="arrow-right" />
    </div>

    <!-- Result State -->
    <div class="bk-publish-summary-state" :class="resultStateClass">
      <div>
        <Icon :name="resultStateIcon" />
      </div>
      <div class="bk-publish-summary-state-label">
        {{ resultStateLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<{
  isPublished: boolean
  mode: 'immediate' | 'scheduled' | 'save'
  currentStateLabel: string
  actionLabel: string
  resultStateLabel: string
}>()

const currentStateIcon = computed<BlokkliIcon>(() =>
  props.isPublished ? 'eye' : 'eye-off',
)

const currentStateClass = computed(() =>
  props.isPublished ? 'bk-is-published' : 'bk-is-unpublished',
)

const resultStateIcon = computed<BlokkliIcon>(() => {
  if (props.mode === 'save') {
    return 'eye-off'
  }
  return 'eye'
})

const resultStateClass = computed(() => {
  if (props.mode === 'save') {
    return 'bk-is-unpublished'
  }
  return 'bk-is-published'
})

const actionIcon = computed<BlokkliIcon>(() => {
  if (props.mode === 'save') return 'save'
  if (props.mode === 'scheduled') return 'calendar-clock'
  return 'publish'
})

const actionClass = computed(() => {
  if (props.mode === 'save') return 'bk-is-save'
  if (props.mode === 'scheduled') return 'bk-is-scheduled'
  return 'bk-is-publish'
})
</script>
