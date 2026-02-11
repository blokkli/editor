import { Paragraph } from './Paragraph'
import imageUrl from './images/widget.png?url'

export class ParagraphWidget extends Paragraph {
  static override bundle = 'widget'
  static override label = 'Widget'
  static override description =
    'A demo block showcasing all available option types.'
  static override imageUrl = imageUrl
}
