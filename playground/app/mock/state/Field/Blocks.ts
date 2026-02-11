import { falsy } from '~~/helpers'
import { entityStorageManager } from '../../entityStorage'
import { mapMockField } from '../../state'
import { Paragraph } from '../Paragraph/Paragraph'
import { Field } from '../Field'

type FieldItem = { uuid: string }

type PossibleItem = Paragraph | FieldItem | string

export class FieldBlocks extends Field<{ uuid: string }> {
  allowedBundles: string[]

  constructor(
    id: string,
    label: string,
    cardinality: number,
    required: boolean,
    allowedBundles: string[],
  ) {
    super('blocks', id, label, cardinality, required)
    this.allowedBundles = allowedBundles
  }

  getBlocks(): Paragraph[] {
    return this.list
      .map((item) => {
        const block = entityStorageManager.load(
          'paragraph',
          item.uuid,
        ) as Paragraph
        if (block) {
          return block.getTranslation(this.entity.langcode)
        }
      })
      .filter(falsy)
  }

  setBlocks(blocks: Paragraph[]) {
    this.list = blocks.map((v) => {
      return { uuid: v.uuid }
    })
  }

  override append(v: PossibleItem) {
    const item = this.mapItem(v)
    this.list.push(item)
  }

  override setList(items: PossibleItem[] = []) {
    super.setList(items.map(this.mapItem))
  }

  override getPropValue() {
    return mapMockField(this)
  }

  private mapItem(v: PossibleItem): FieldItem {
    if (v instanceof Paragraph) {
      return { uuid: v.uuid }
    } else if (typeof v === 'string') {
      return { uuid: v }
    } else if (typeof v === 'object' && 'uuid' in v) {
      return { uuid: v.uuid }
    }

    throw new Error('Invalid field item: ' + v)
  }
}
