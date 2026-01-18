import { Entity } from './Entity'
import type { Field } from './Field'
import { FieldBlocks } from './Field/Blocks'
import { FieldText } from './Field/Text'
import { FieldBoolean } from './Field/Boolean'

export class TemplateItem extends Entity {
  static override entityType = 'template_item'
  static override bundle = 'template_item'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldText('description', 'Description'),
      new FieldBlocks('blocks', 'Blocks', -1, true, []),
      new FieldBoolean('isDefault', 'Is Default'),
    ]
  }

  getBlocks(): FieldBlocks {
    return this.get('blocks')
  }

  title(): string {
    return this.get<FieldText>('title').getText()
  }

  description(): string {
    return this.get<FieldText>('description').getText()
  }

  isDefault(): boolean {
    return this.get<FieldBoolean>('isDefault').list[0] === true
  }
}
