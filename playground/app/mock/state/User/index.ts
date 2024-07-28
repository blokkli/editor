import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'

export class User extends Entity {
  static override entityType = 'user'
  static override bundle = 'user'
  static override label = 'User'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('name', 'Name'),
      new FieldText('email', 'Email'),
    ]
  }

  getName(): string {
    return this.get<FieldText>('name').getText()
  }
}
