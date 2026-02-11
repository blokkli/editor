import { Paragraph } from './Paragraph'
import imageUrl from './images/on_this_page.png?url'

export class ParagraphOnThisPage extends Paragraph {
  static override bundle = 'on_this_page'
  static override label = 'On this page'
  static override description =
    'Auto-generates a navigation menu from page section titles.'
  static override imageUrl = imageUrl
}
