<template>
  <div :class="[spacing, { 'container-content': hasContainer }]">
    <SiteLink
      v-blokkli-droppable:field_link
      :to="target.href"
      class="button"
      :class="{
        'is-secondary': options.style === 'secondary',
        'is-on-dark': fieldListType === 'footer',
        'w-full': fieldListType === 'sidebar',
      }"
    >
      <span v-blokkli-editable:field_title>{{ label }}</span>
    </SiteLink>
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphLinkFragment } from '#graphql-operations'

// A link as a button. In a link list, InList.vue renders it as a row.
const props = defineProps<ParagraphLinkFragment>()

const { $texts } = useEasyTexts()

const target = computed(() => linkTarget(props.link))

const label = computed(
  () => props.title || target.value.label || $texts('link.label', 'Link'),
)

const block = defineBlokkli({
  bundle: 'link',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    style: {
      type: 'radios',
      label: { en: 'Style', de: 'Stil', fr: 'Style' },
      default: 'primary',
      options: {
        primary: { label: { en: 'Primary', de: 'Primär', fr: 'Principal' } },
        secondary: {
          label: { en: 'Secondary', de: 'Sekundär', fr: 'Secondaire' },
        },
      },
    },
  },
  editor: {
    icon: 'bk_mdi_link',
    editTitle: (el) => el.textContent,
    // In a list or a call to action, a link is a row (InList.vue).
    determineVisibleOptions: (ctx) =>
      ctx.parentType === 'link_list' || ctx.parentType === 'call_to_action'
        ? []
        : ['style'],
  },
})
const { options, fieldListType } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)
</script>
