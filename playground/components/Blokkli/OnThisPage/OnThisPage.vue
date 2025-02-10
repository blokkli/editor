<template>
  <div class="container py-30">
    <h2 class="font-bold text-2xl mb-20">On this page</h2>
    <ul class="flex gap-15">
      <li v-for="(link, i) in links" :key="i">
        <a :href="link.url" class="font-bold text-sm uppercase text-mono-700">{{
          link.label
        }}</a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import { falsy } from '~/helpers'
import { defineBlokkli, computed } from '#imports'
import { getRuntimeOptions, getItemsforBundles } from '#blokkli/runtime-helpers'

const { rootBlocks } = defineBlokkli({
  bundle: 'on_this_page',
  editor: {
    disableEdit: true,
  },
})

export type Props = object

type OnThisPageLink = {
  label: string
  url: string
}

const mapItem = (
  item: FieldListItemTyped,
): OnThisPageLink | undefined | OnThisPageLink[] => {
  if (item.bundle === 'title') {
    const options = getRuntimeOptions(item)
    const label = item.props?.tagline || item.props?.title
    if (options.showInMenu) {
      return {
        label,
        url: '#title-' + item.uuid,
      }
    }
  } else if (item.bundle === 'two_columns' || item.bundle === 'grid') {
    return item.props.header.flatMap((v) => mapItem(v)).filter(falsy)
  }
}

const links = computed<OnThisPageLink[]>(() =>
  getItemsforBundles(rootBlocks.value, ['title', 'two_columns', 'grid'])
    .flatMap(mapItem)
    .filter(falsy),
)
</script>
