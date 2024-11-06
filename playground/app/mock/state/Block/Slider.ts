import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockSlider extends Block {
  static override bundle = 'slider'
  static override label = 'Slider'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('slides', 'Slides', -1, true, ['two_columns', 'grid']),
    ]
  }
}
