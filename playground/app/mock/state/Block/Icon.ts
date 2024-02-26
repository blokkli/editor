import type { Field } from '../Field'
import { FieldIcon } from '../Field/Icon'
import { Block } from './Block'

export class BlockIcon extends Block {
  static bundle = 'icon'
  static label = 'Icon'
  static isTranslatable = true

  static getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldIcon('icon', 'Icon')]
  }
}
