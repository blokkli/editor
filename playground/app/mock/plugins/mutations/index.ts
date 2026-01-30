import type { Mutation } from './Mutation'
import { MutationAdd, type MutationAddArgs } from './Mutation/Add'
import {
  MutationAddReusableItem,
  type MutationAddReusableItemArgs,
} from './Mutation/AddReusableItem'
import {
  MutationAddVideoFromUrl,
  type MutationAddVideoFromUrlArgs,
} from './Mutation/AddVideoFromUrl'
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
  MutationHostTransform,
  type MutationHostTransformArgs,
} from './Mutation/HostTransform'
import {
  MutationMakeReusable,
  type MutationMakeReusableArgs,
} from './Mutation/MakeReusable'
import { MutationMove, type MutationMoveArgs } from './Mutation/Move'
import {
  MutationReplaceEntityMedia,
  type MutationReplaceEntityMediaArgs,
} from './Mutation/ReplaceEntityMedia'
import {
  MutationReplaceMedia,
  type MutationReplaceMediaArgs,
} from './Mutation/ReplaceMedia'
import {
  MutationTransform,
  type MutationTransformArgs,
} from './Mutation/Transform'
import {
  MutationUpdateEntityFieldValue,
  type MutationUpdateEntityFieldValueArgs,
} from './Mutation/UpdateEntityFieldValue'
import {
  MutationUpdateFieldValue,
  type MutationUpdateFieldValueArgs,
} from './Mutation/UpdateFieldValue'
import {
  MutationUpdateHostOptions,
  type MutationUpdateHostOptionsArgs,
} from './Mutation/UpdateHostOptions'
import {
  MutationUpdateOptions,
  type MutationUpdateOptionsArgs,
} from './Mutation/UpdateOptions'
import {
  MutationSetBlockSchedule,
  type MutationSetBlockScheduleArgs,
} from './Mutation/SetBlockSchedule'
import {
  MutationAddTemplate,
  type MutationAddTemplateArgs,
} from './Mutation/AddTemplate'
import {
  MutationCreateTemplate,
  type MutationCreateTemplateArgs,
} from './Mutation/CreateTemplate'
import {
  MutationApplyRewrite,
  type MutationApplyRewriteArgs,
} from './Mutation/ApplyRewrite'

export type MutationArgsMap = {
  add: MutationAddArgs | MutationAddArgs[]
  delete: MutationDeleteArgs
  move: MutationMoveArgs
  duplicate: MutationDuplicateArgs
  edit: MutationEditArgs
  edit_translation: MutationEditTranslationArgs
  update_options: MutationUpdateOptionsArgs
  update_host_options: MutationUpdateHostOptionsArgs
  make_reusable: MutationMakeReusableArgs
  add_reusable_item: MutationAddReusableItemArgs
  update_field_value: MutationUpdateFieldValueArgs
  update_entity_field_value: MutationUpdateEntityFieldValueArgs
  transform: MutationTransformArgs
  transform_host: MutationHostTransformArgs
  detach_reusable: MutationDetachReusableArgs
  edit_entity: MutationEditEntityArgs
  replace_media: MutationReplaceMediaArgs
  replace_entity_media: MutationReplaceEntityMediaArgs
  add_video_from_url: MutationAddVideoFromUrlArgs
  set_block_schedule: MutationSetBlockScheduleArgs
  add_template: MutationAddTemplateArgs
  create_template: MutationCreateTemplateArgs
  apply_rewrite: MutationApplyRewriteArgs
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
    case 'update_host_options':
      return new MutationUpdateHostOptions(configuration)
    case 'make_reusable':
      return new MutationMakeReusable(configuration)
    case 'add_reusable_item':
      return new MutationAddReusableItem(configuration)
    case 'update_field_value':
      return new MutationUpdateFieldValue(configuration)
    case 'update_entity_field_value':
      return new MutationUpdateEntityFieldValue(configuration)
    case 'transform':
      return new MutationTransform(configuration)
    case 'transform_host':
      return new MutationHostTransform(configuration)
    case 'detach_reusable':
      return new MutationDetachReusable(configuration)
    case 'edit_entity':
      return new MutationEditEntity(configuration)
    case 'replace_media':
      return new MutationReplaceMedia(configuration)
    case 'replace_entity_media':
      return new MutationReplaceEntityMedia(configuration)
    case 'add_video_from_url':
      return new MutationAddVideoFromUrl(configuration)
    case 'set_block_schedule':
      return new MutationSetBlockSchedule(configuration)
    case 'add_template':
      return new MutationAddTemplate(configuration)
    case 'create_template':
      return new MutationCreateTemplate(configuration)
    case 'apply_rewrite':
      return new MutationApplyRewrite(configuration)
  }

  throw new Error('Missing mutation plugin with ID: ' + id)
}
