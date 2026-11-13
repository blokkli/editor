<template>
  <div class="grid gap-y-flow" data-test="story-scene" data-test-layout="split">
    <!--
      One <BlokkliItem> around both halves of a section: while editing, the
      section is the block, the visual on the left and the text on the right.
    -->
    <BlokkliItem v-for="item in sections" :key="item.uuid" v-bind="item">
      <div
        class="grid items-center gap-grid md:grid-cols-[7fr_5fr]"
        data-test="story-section"
        :data-test-uuid="item.uuid"
      >
        <MediaImage
          v-if="item.bundle === 'teaser' && item.props.image"
          v-bind="item.props.image"
          img-class="aspect-[3/2] w-full object-cover"
        />
        <MediaImage
          v-else-if="item.bundle === 'image' && item.props.media"
          v-bind="item.props.media"
          img-class="aspect-[3/2] w-full object-cover"
        />
        <div v-else class="flex aspect-[3/2] items-center bg-primary-light p-8">
          <h3
            v-if="item.bundle === 'accordion'"
            v-blokkli-editable:field_title
            :data-placeholder="$texts('placeholder.title', 'Title')"
            class="editable-placeholder text-h2 text-primary"
          >
            {{ item.props.title }}
          </h3>
        </div>

        <div>
          <template v-if="item.bundle === 'teaser'">
            <h3
              v-blokkli-editable:field_title
              :data-placeholder="$texts('placeholder.title', 'Title')"
              class="editable-placeholder text-h3"
            >
              {{ item.props.title }}
            </h3>
            <p
              v-if="item.props.lead || isEditing"
              v-blokkli-editable:field_lead
              :data-placeholder="$texts('placeholder.text', 'Text')"
              class="editable-placeholder mt-3 text-lead"
            >
              {{ item.props.lead }}
            </p>
          </template>
          <p
            v-else-if="item.bundle === 'image'"
            v-blokkli-editable:field_caption
            :data-placeholder="$texts('placeholder.caption', 'Caption')"
            class="editable-placeholder text-small text-muted"
          >
            {{ item.props.caption }}
          </p>
          <BlokkliField
            v-else-if="item.bundle === 'accordion'"
            name="field_paragraphs"
            :list="item.props.paragraphs"
            edit-class="min-h-16"
          />
        </div>
      </div>
    </BlokkliItem>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli-build/generated-types'

// Each section's visual on the left and its text on the right. On the site,
// every section; while editing, the one the field shows.
const props = defineProps<{
  items: FieldListItemTyped[]
  shownIndex: number | null
}>()

const isEditing = import.meta.blokkliEditing

const sections = computed(() => {
  if (props.shownIndex === null) {
    return props.items
  }
  const shown = props.items[props.shownIndex]
  return shown ? [shown] : []
})
</script>
