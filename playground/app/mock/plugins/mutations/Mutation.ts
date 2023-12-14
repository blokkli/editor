import { type MutationContext } from '../../state/EditState'
import { generateUUID } from '../../uuid'
import { Plugin } from '../Plugin'

export class Mutation extends Plugin {
  id: string

  constructor(id: string, configuration?: Record<string, any>) {
    super('mutation')
    this.id = id
    if (configuration) {
      this.configuration = configuration
    }
  }

  getUuidForNewEntity(prefix = 'default'): string {
    const key = 'new_uuid_' + prefix
    if (this.configuration[key]) {
      return this.configuration[key]
    }

    const uuid = generateUUID()
    this.configuration[key] = uuid
    return uuid
  }

  execute(context: MutationContext, args: any) {}
}
