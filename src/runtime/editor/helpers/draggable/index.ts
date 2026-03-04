import type { DraggableExistingBlock } from '#blokkli/editor/types/draggable'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'

export function toDraggableExisting(
  v: RenderedFieldListItem | RenderedFieldListItem[],
): DraggableExistingBlock[] {
  const blocks = Array.isArray(v) ? v : [v]
  return blocks.map<DraggableExistingBlock>((block) => {
    return {
      itemType: 'existing',
      block,
    }
  })
}
