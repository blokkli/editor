<template>
  <div class="flex items-center justify-between">
    <!-- Current State -->
    <div
      class="flex items-center gap-5 relative justify-center [&_.bk-icon]:size-15 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-current"
    >
      <div
        class="size-25 rounded-full flex items-center justify-center border"
        :class="{
          'border-lime-normal text-lime-normal': isPublished,
          'border-red-normal text-red-normal': !isPublished,
        }"
      >
        <Icon :name="currentStateIcon" />
      </div>
      <div class="text-sm font-medium text-mono-700 text-center">
        {{ currentStateLabel }}
      </div>
    </div>

    <!-- Arrow -->
    <div
      class="flex items-center [&_.bk-icon]:size-20 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-mono-700"
    >
      <Icon name="bk_mdi_arrow_right" />
    </div>

    <!-- Action -->
    <div
      class="flex items-center gap-5 relative justify-center [&_.bk-icon]:size-15 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-current"
    >
      <div
        class="size-25 rounded-full flex items-center justify-center border"
        :class="{
          'bg-red-normal border-red-dark text-white': mode === 'save',
          'bg-yellow-normal border-yellow-dark text-yellow-dark':
            mode === 'scheduled',
          'bg-lime-normal border-lime-dark text-white': mode === 'immediate',
        }"
      >
        <Icon :name="actionIcon" />
      </div>
      <div class="text-sm font-medium text-mono-700 text-center">
        {{ actionLabel }}
      </div>
    </div>

    <!-- Arrow -->
    <div
      class="flex items-center [&_.bk-icon]:size-20 [&_.bk-icon_svg]:size-full [&_.bk-icon_svg]:fill-mono-700"
    >
      <Icon name="bk_mdi_arrow_left" />
    </div>

    <!-- Result State -->
    <div
      class="flex items-center gap-5 relative justify-center border rounded-full pr-10 [&_.bk-icon]:size-25 [&_.bk-icon]:rounded-full [&_.bk-icon]:flex [&_.bk-icon]:items-center [&_.bk-icon]:justify-center [&_.bk-icon]:bg-white [&_.bk-icon_svg]:size-15"
      :class="{
        'bg-lime-normal border-lime-normal [&_.bk-icon_svg]:fill-lime-normal':
          isResultPublished,
        'bg-red-normal border-red-normal [&_.bk-icon_svg]:fill-red-normal':
          !isResultPublished,
      }"
    >
      <div>
        <Icon :name="resultStateIcon" />
      </div>
      <div class="pr-5 font-semibold leading-none text-sm text-white">
        {{ resultStateLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<{
  isPublished: boolean
  mode: 'immediate' | 'scheduled' | 'save'
  currentStateLabel: string
  actionLabel: string
  resultStateLabel: string
}>()

const currentStateIcon = computed<BlokkliIcon>(() =>
  props.isPublished ? 'bk_mdi_visibility' : 'bk_mdi_visibility_off',
)

const isResultPublished = computed(() => props.mode !== 'save')

const resultStateIcon = computed<BlokkliIcon>(() =>
  props.mode === 'save' ? 'bk_mdi_visibility_off' : 'bk_mdi_visibility',
)

const actionIcon = computed<BlokkliIcon>(() => {
  if (props.mode === 'save') return 'bk_mdi_save'
  if (props.mode === 'scheduled') return 'bk_mdi_calendar_clock'
  return 'bk_mdi_publish'
})
</script>
