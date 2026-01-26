import { Block } from './Block'
import imageUrl from './images/on_this_page.png?url'

export class BlockOnThisPage extends Block {
  static override bundle = 'on_this_page'
  static override label = 'On this page'
  static override description =
    'Auto-generates a navigation menu from page section titles.'
  static override imageUrl = imageUrl
}
