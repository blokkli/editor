<template>
  <!-- Room around the block, for a picture that's larger than the block. -->
  <div class="bg-white py-[50vh]">
    <BlokkliProvider
      v-if="item"
      entity-type="node"
      :entity-bundle="width ? 'page' : 'editorial'"
      :entity-uuid="item.uuid"
      class="mx-auto"
      :style="{ maxWidth: width ? `${width}px` : undefined }"
      data-test="block-image"
    >
      <BlokkliField name="field_paragraphs" :list="item" />
    </BlokkliProvider>
  </div>
</template>

<script lang="ts" setup>
// One block on its own, on a white page: the editor's add list shows a picture
// of each block type, which `bun run sandbox:block-images` takes of this page.
// Only on the dev server (nuxt.config.ts).
definePageMeta({ layout: false })

const route = useRoute()

// A width for a block that's narrower on pages than on its own, e.g. a teaser,
// one of several there. Blocks take the width of a detail page's column,
// without a container of their own (useHasContainer).
const width = Number(route.query.width) || null

const { data } = await useAsyncGraphqlQuery('blockImage', {
  uuid: String(route.params.uuid),
})

const item = computed(() => {
  const entity = data.value?.data.entityByUuid
  if (!entity || !('uuid' in entity)) {
    return null
  }
  // Also when it's unpublished, like the site's notice once it's over.
  return { ...entity, isVisible: true }
})
</script>
