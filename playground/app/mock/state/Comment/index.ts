import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldBoolean } from '../Field/Boolean'
import { FieldReference } from '../Field/Reference'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { FieldTimestamp } from '../Field/Timestamp'
import type { User } from '../User'

export class Comment extends Entity {
  static override entityType = 'comment'
  static override bundle = 'comment'
  static override label = 'Comment'

  constructor(uuid: string) {
    super(uuid)
    if (this.fields.created) {
      this.fields.created.list = [Date.now()]
    }
  }

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldTimestamp('created', 'Created'),
      new FieldTimestamp('updated', 'Updated'),
      new FieldTextarea('body', 'Body'),
      new FieldBoolean('isResolved', 'Is Resolved'),
      new FieldText('parentEntityType', 'Parent Entity Type'),
      new FieldText('parentEntityUuid', 'Parent Entity UUID'),
      new FieldText('parentUuid', 'Parent Comment UUID'),
      new FieldReference('user', 'User', 1, false, 'user', []),
      new FieldReference(
        'referencedBlocks',
        'Referenced Blocks',
        -1,
        false,
        'paragraph',
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

  getUpdated(): number | undefined {
    const value = this.get<FieldTimestamp>('updated').getTimestamp()
    return value || undefined
  }

  getParentUuid(): string | undefined {
    return this.get<FieldText>('parentUuid').getUnprocessed() || undefined
  }

  getUser(): User {
    return this.get<FieldReference<User>>('user').getReferencedEntities()[0]!
  }
}
