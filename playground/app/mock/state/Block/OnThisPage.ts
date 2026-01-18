import { Block } from './Block'

export class BlockOnThisPage extends Block {
  static override bundle = 'on_this_page'
  static override label = 'On this page'
  static override description =
    'Auto-generates a navigation menu from page section titles.'
}
