import { Paragraph } from './Paragraph'

export class ParagraphChart extends Paragraph {
  static override bundle = 'chart'
  static override label = 'Chart'
  static override description = 'An interactive chart.'
  static override allowReusable = true
}
