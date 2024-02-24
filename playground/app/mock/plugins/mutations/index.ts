import type { Mutation } from './Mutation'
import { MutationAdd, type MutationAddArgs } from './Mutation/Add'
import {
  MutationAddReusableItem,
  type MutationAddReusableItemArgs,
} from './Mutation/AddReusableItem'
import { MutationDelete, type MutationDeleteArgs } from './Mutation/Delete'
import {
  MutationDetachReusable,
  type MutationDetachReusableArgs,
} from './Mutation/DetachReusable'
import {
  MutationDuplicate,
  type MutationDuplicateArgs,
} from './Mutation/Duplicate'
import { MutationEdit, type MutationEditArgs } from './Mutation/Edit'
import {
  MutationEditEntity,
  type MutationEditEntityArgs,
} from './Mutation/EditEntity'
import {
  MutationEditTranslation,
  type MutationEditTranslationArgs,
} from './Mutation/EditTranslation'
import {
  MutationMakeReusable,
  type MutationMakeReusableArgs,
} from './Mutation/MakeReusable'
import { MutationMove, type MutationMoveArgs } from './Mutation/Move'
import {
  MutationReplaceMedia,
  type MutationReplaceMediaArgs,
} from './Mutation/ReplaceMedia'
import {
  MutationTransform,
  type MutationTransformArgs,
} from './Mutation/Transform'
import {
  MutationUpdateFieldValue,
  type MutationUpdateFieldValueArgs,
} from './Mutation/UpdateFieldValue'
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
  edit_translation: MutationEditTranslationArgs
  update_options: MutationUpdateOptionsArgs
  make_reusable: MutationMakeReusableArgs
  add_reusable_item: MutationAddReusableItemArgs
  update_field_value: MutationUpdateFieldValueArgs
  transform: MutationTransformArgs
  detach_reusable: MutationDetachReusableArgs
  edit_entity: MutationEditEntityArgs
  replace_media: MutationReplaceMediaArgs
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
    case 'edit_translation':
      return new MutationEditTranslation(configuration)
    case 'update_options':
      return new MutationUpdateOptions(configuration)
    case 'make_reusable':
      return new MutationMakeReusable(configuration)
    case 'add_reusable_item':
      return new MutationAddReusableItem(configuration)
    case 'update_field_value':
      return new MutationUpdateFieldValue(configuration)
    case 'transform':
      return new MutationTransform(configuration)
    case 'detach_reusable':
      return new MutationDetachReusable(configuration)
    case 'edit_entity':
      return new MutationEditEntity(configuration)
    case 'replace_media':
      return new MutationReplaceMedia(configuration)
  }

  throw new Error('Missing mutation plugin with ID: ' + id)
}
