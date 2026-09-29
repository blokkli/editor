<template>
  <div
    v-blokkli-droppable:field_link
    :class="{ 'container-content': !parentType, hidden: !url && !isEditing }"
  >
    <NodeTeaser
      v-if="url"
      v-blokkli-droppable:field_media
      :node
      :title
      :lead
      :image
      :url
      :display="options.display"
      :class="{ 'border-t border-line': options.display === 'list' }"
    />
    <p v-else-if="isEditing" class="bg-surface p-4 text-muted">
      {{
        $texts(
          'teaser.unavailable',
          "The content of this teaser isn't available.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type {
  NodeTeaserFragment,
  ParagraphTeaserFragment,
} from '#graphql-operations'
import NodeTeaser from '~/components/NodeTeaser/index.vue'

// A teaser for a page, news item or event, or for any URL. Its title, lead
// and image override the linked node's.
const props = defineProps<ParagraphTeaserFragment>()

// Only nodes have fields in the fragment: a document's entity is empty.
function isNode(
  entity: NodeTeaserFragment | object,
): entity is NodeTeaserFragment {
  return '__typename' in entity
}

const node = computed(() => {
  const uri = props.link?.uri
  const entity = uri && 'entity' in uri ? uri.entity : null
  return entity && isNode(entity) ? entity : null
})

// A link to a page the visitor can't see (e.g. unpublished) has no entity:
// without a title of its own, the teaser isn't shown.
const url = computed(() => {
  const uri = props.link?.uri
  if (!uri || ('entity' in uri && !node.value && !props.title)) {
    return null
  }
  return uri.path
})

const { options, parentType } = defineBlokkli({
  bundle: 'teaser',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    display: {
      type: 'radios',
      label: { en: 'Display', de: 'Darstellung', fr: 'Affichage' },
      default: 'card',
      options: {
        card: { label: { en: 'Card', de: 'Karte', fr: 'Carte' } },
        list: { label: { en: 'List', de: 'Liste', fr: 'Liste' } },
      },
    },
  },
  editor: {
    icon: 'bk_mdi_article',
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
})

const isEditing = import.meta.blokkliEditing
</script>
