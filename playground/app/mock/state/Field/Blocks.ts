import { falsy } from '#blokkli/helpers'
import { entityStorageManager } from '../../entityStorage'
import { Block } from '../Block/Block'
import { Field } from '../Field'

type FieldItem = { uuid: string }

type PossibleItem = Block | FieldItem | string

export class FieldBlocks extends Field<{ uuid: string }> {
  allowedBundles: string[]

  constructor(
    id: string,
    label: string,
    cardinality: number,
    allowedBundles: string[],
  ) {
    super('blocks', id, label, cardinality)
    this.allowedBundles = allowedBundles
  }

  getBlocks(): Block[] {
    return this.list
      .map((item) => {
        return entityStorageManager.load('block', item.uuid) as Block
      })
      .filter(falsy)
  }

  setBlocks(blocks: Block[]) {
    this.list = blocks.map((v) => {
      return { uuid: v.uuid }
    })
  }

  append(v: PossibleItem) {
    const item = this.mapItem(v)
    this.list.push(item)
  }

  setList(items: PossibleItem[] = []) {
    super.setList(items.map(this.mapItem))
  }

  private mapItem(v: PossibleItem): FieldItem {
    if (v instanceof Block) {
      return { uuid: v.uuid }
    } else if (typeof v === 'string') {
      return { uuid: v }
    } else if (typeof v === 'object' && 'uuid' in v) {
      return { uuid: v.uuid }
    }

    throw new Error('Invalid field item: ' + v)
  }
}