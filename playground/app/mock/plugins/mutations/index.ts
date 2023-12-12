import type { Mutation } from './Mutation'
import { MutationAdd, type MutationAddArgs } from './Mutation/Add'
import { MutationDelete, type MutationDeleteArgs } from './Mutation/Delete'
import {
  MutationDuplicate,
  type MutationDuplicateArgs,
} from './Mutation/Duplicate'
import { MutationEdit, type MutationEditArgs } from './Mutation/Edit'
import { MutationMove, type MutationMoveArgs } from './Mutation/Move'
import {
  MutationUpdateOptions,
  type MutationUpdateOptionsArgs,
} from './Mutation/UpdateOptions'

export type MutationArgsMap = {
  add: MutationAddArgs
  delete: MutationDeleteArgs
  move: MutationMoveArgs
  duplicate: MutationDuplicateArgs
  edit: MutationEditArgs
  update_options: MutationUpdateOptionsArgs
}

export const createMutation = <T extends keyof MutationArgsMap>(
  id: T,
  configuration?: Record<string, any>,
): Mutation => {
  switch (id) {
    case 'add':
      return new MutationAdd(configuration)
    case 'delete':
      return new MutationDelete(configuration)
    case 'move':
      return new MutationMove(configuration)
    case 'duplicate':
      return new MutationDuplicate(configuration)
    case 'edit':
      return new MutationEdit(configuration)
    case 'update_options':
      return new MutationUpdateOptions(configuration)
  }

  throw new Error('Missing mutation plugin with ID: ' + id)
}
