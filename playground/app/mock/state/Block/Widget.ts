import { Block } from './Block'

export class BlockWidget extends Block {
  static override bundle = 'widget'
  static override label = 'Widget'
  static override description =
    'A demo block showcasing all available option types.'
}
