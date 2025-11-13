import { Block } from './Block'

export class BlockNotImplemented extends Block {
  static override bundle = 'not_implemented'
  static override label = 'Not Implemented'
  static override isTranslatable = false
}
