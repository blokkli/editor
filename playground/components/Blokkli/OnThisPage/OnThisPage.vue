<template>
  <div class="container py-30">
    <h2 class="font-bold text-2xl mb-20">On this page</h2>
    <ul class="flex gap-15">
      <li v-for="(link, i) in links" :key="i">
        <a
          :href="link.url"
          class="font-bold text-sm uppercase text-slate-700"
          >{{ link.label }}</a
        >
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli/generated-types'
import { falsy } from '#blokkli/helpers'
import { defineBlokkli, computed } from '#imports'

const { rootBlocks } = defineBlokkli({
  bundle: 'on_this_page',
  disableEdit: true,
})

type OnThisPageLink = {
  label: string
  url: string
}

const mapItem = (
  item: FieldListItemTyped,
): OnThisPageLink | undefined | OnThisPageLink[] => {
  if (item.bundle === 'title') {
    const label = item.props.tagline || item.props.title
    if (item.options.showInMenu !== '0' && label) {
      return {
        label,
        url: '#title-' + item.uuid,
      }
    }
  } else if (item.bundle === 'two_columns' || item.bundle === 'grid') {
    // For some reason the type here is not an array, even though the prop is actually an array.
    const headerItems: FieldListItemTyped[] = (item.props as any).header || []
    return headerItems.flatMap((v) => mapItem(v)).filter(falsy)
  }
}

const links = computed<OnThisPageLink[]>(() => {
  return rootBlocks.value.flatMap((item) => mapItem(item)).filter(falsy)
})
</script>
