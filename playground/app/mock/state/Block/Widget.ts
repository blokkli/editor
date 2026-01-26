import { Block } from './Block'
import imageUrl from './images/widget.png?url'

export class BlockWidget extends Block {
  static override bundle = 'widget'
  static override label = 'Widget'
  static override description =
    'A demo block showcasing all available option types.'
  static override imageUrl = imageUrl
}
