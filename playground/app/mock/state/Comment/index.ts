import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldBoolean } from '../Field/Boolean'
import { FieldReference } from '../Field/Reference'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { FieldTimestamp } from '../Field/Timestamp'
import type { User } from '../User'

export class Comment extends Entity {
  static entityType = 'comment'
  static bundle = 'comment'
  static label = 'Comment'

  constructor(uuid: string) {
    super(uuid)
    this.fields.created.list = [Date.now()]
  }

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldTimestamp('created', 'Created'),
      new FieldTextarea('body', 'Body'),
      new FieldBoolean('isResolved', 'Is Resolved'),
      new FieldText('parentEntityType', 'Parent Entity Type'),
      new FieldText('parentEntityUuid', 'Parent Entity UUID'),
      new FieldReference('user', 'User', 1, false, 'user', []),
      new FieldReference(
        'referencedBlocks',
        'Referenced Blocks',
        -1,
        false,
        'block',
        [],
      ),
    ]
  }

  getBlockUuids(): string[] {
    return this.get('referencedBlocks').list
  }

  isResolved(): boolean {
    return !!this.get('isResolved').list[0]
  }

  getBody(): string {
    return this.get<FieldTextarea>('body').getText()
  }

  getCreated(): number {
    return this.get<FieldTimestamp>('created').getTimestamp()
  }

  getUser(): User {
    return this.get<FieldReference<User>>('user').getReferencedEntities()[0]
  }
}
