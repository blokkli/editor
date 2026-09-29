import { computed } from '#imports'
import type { ComputedRef } from 'vue'

// The paragraphs whose blocks stack: a host's main field, and a section's, an
// accordion's or the columns' field. Grids (a section's columns, the front
// page) space their blocks with a gap instead.
const STACKS = ['section', 'accordion', 'columns']

// The blocks that start with a heading.
const HEADINGS = ['title', 'section', 'teaser_list']

/**
 * The space above a block, as a class. Each block decides it with the one
 * before it: none at the start of a field, more above a heading, less below a
 * title, whose text belongs to it. Pass what defineBlokkli() returns.
 */
export function useBlockSpacing(block: {
  index: ComputedRef<number>
  siblings: ComputedRef<{ bundle: string }[]>
  parentType: ComputedRef<string | undefined>
  fieldListType: ComputedRef<string>
}) {
  return computed(() => {
    const index = block.index.value
    const parentType = block.parentType.value
    if (
      block.fieldListType.value !== 'default' ||
      (parentType && !STACKS.includes(parentType)) ||
      index === 0
    ) {
      return ''
    }
    const bundle = block.siblings.value[index]?.bundle ?? ''
    if (HEADINGS.includes(bundle)) {
      return 'mt-heading'
    }
    if (block.siblings.value[index - 1]?.bundle === 'title') {
      return 'mt-4'
    }
    return 'mt-flow'
  })
}
