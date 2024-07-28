import type { Field } from '../Field'
import { FieldIcon } from '../Field/Icon'
import { Block } from './Block'

export class BlockIcon extends Block {
  static override bundle = 'icon'
  static override label = 'Icon'
  static override isTranslatable = true

  static override getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldIcon('icon', 'Icon')]
  }
}
