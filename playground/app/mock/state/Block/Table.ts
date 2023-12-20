import { LOREM_SHORT } from '../../defaultText'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockTable extends Block {
  static bundle = 'table'
  static label = 'Table'
  static allowReusable = true

  static getDefaultValues(): Record<string, any> {
    return {
      markup: `
      <table>
        <thead>
          <tr>
            <th>Column A</th>
            <th>Column B</th>
            <th>Column C</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Row 1</td>
            <td>Row 1</td>
            <td>Row 1</td>
          </tr>
          <tr>
            <td>Row 2</td>
            <td>Row 2</td>
            <td>Row 2</td>
          </tr>
        </tbody>
      </table>
      `,
      caption: LOREM_SHORT,
    }
  }

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('caption', 'Caption'),
      new FieldTextarea('markup', 'Markup'),
    ]
  }
}
