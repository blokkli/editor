<template>
  <li>
    <SiteLink
      :to="url"
      class="block border-b border-line py-3.5 font-semibold text-ink hover:text-primary"
    >
      <span ref="content" class="flex items-center gap-4">
        <span class="grow">
          <slot>{{ label }}</slot>
        </span>
        <span v-if="meta" class="shrink-0 text-small font-normal text-muted">
          {{ meta }}
        </span>
        <SpriteSymbol
          :name="download ? 'download' : 'arrow-right'"
          class="size-5 shrink-0 text-primary"
        />
      </span>
    </SiteLink>
  </li>
</template>

<script lang="ts" setup>
// A row of a link list: the label, a download's meta text (e.g. "PDF, 240
// kB"), and an icon at the end: a download's or a link's arrow. The label can
// be a slot, e.g. to make it editable.
defineProps<{
  label?: string
  url?: string
  meta?: string
  download?: boolean
}>()

// In the editor, a link in a link list is the row's content, without its
// padding (Link/InList.vue): a click on the padding selects the list.
const content = useTemplateRef('content')
defineExpose({ blokkliDraggable: content })
</script>
