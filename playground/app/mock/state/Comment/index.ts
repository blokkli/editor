import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldBoolean } from '../Field/Boolean'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'

export class Comment extends Entity {
  static entityType = 'comment'
  static bundle = 'comment'
  static label = 'Comment'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldTextarea('body', 'Body'),
      new FieldBoolean('isResolved', 'Is Resolved'),
      new FieldText('parentEntityType', 'Parent Entity Type'),
      new FieldText('parentEntityUuid', 'Parent Entity UUID'),
      new FieldText('referencedBlocks', 'Referenced Blocks', -1),
    ]
  }
}
