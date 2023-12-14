import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'

export class User extends Entity {
  static entityType = 'user'
  static bundle = 'user'
  static label = 'User'

  static getFieldDefintions(): Field<any>[] {
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
