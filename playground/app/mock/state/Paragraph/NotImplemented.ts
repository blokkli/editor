import { Paragraph } from './Paragraph'

export class ParagraphNotImplemented extends Paragraph {
  static override bundle = 'not_implemented'
  static override label = 'Not Implemented'
  static override description = 'A placeholder for blocks not yet implemented.'
  static override isTranslatable = false
}
