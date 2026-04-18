import type { InjectionKey, ComputedRef, Component } from 'vue'
import type { EntityContext } from './../types'
import type { DebugLogger } from '#blokkli/editor/providers/debug'
import type {
  FieldListItemTyped,
  ValidFieldListTypes,
  ValidProviderTypes,
} from '#blokkli-build/generated-types'
import type DraggableListComponent from '../editor/components/DraggableList.vue'
import type BlokkliEditableEditComponent from '../editor/components/BlokkliEditableEdit.vue'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  MutatedField,
  MutatedItemProps,
  MutatedOptions,
} from '#blokkli/editor/types/state'
import type { DefineBlokkliContext } from '#blokkli/types/definitions'
import type { InjectedBlokkliItem } from '#blokkli/types/field'
import type { Eventbus } from '#blokkli/editor/events'
import type { DomProvider } from '#blokkli/editor/providers/dom'
import type { DefinitionProvider } from '#blokkli/editor/providers/definition'
import type { BlokkliProviderEntityContext } from '#blokkli/types/provider'

type ItemEditContext = {
  eventBus: Eventbus
  mutatedOptions: MutatedOptions
  dom?: DomProvider
  definitions: DefinitionProvider
  useBlockRegistration?: (dom: DomProvider, uuid: string) => void
}

export const INJECT_APP = Symbol('blokkli_app') as InjectionKey<BlokkliApp>

/**
 * The reduced edit context.
 */
export const INJECT_EDIT_CONTEXT = Symbol(
  'blokkli_edit_context',
) as InjectionKey<ItemEditContext | null>

/**
 * Whether we're currently editing (within the editor).
 */
export const INJECT_IS_EDITING = Symbol(
  'blokkli_is_editing',
) as InjectionKey<boolean>

/**
 * Whether the block is rendered within another block (nested).
 */
export const INJECT_IS_NESTED = Symbol(
  'blokkli_is_nested',
) as InjectionKey<boolean>

/**
 * The current nesting level, starting at 0.
 */
export const INJECT_NESTING_LEVEL = Symbol(
  'blokkli_nesting_level',
) as InjectionKey<number>

/**
 * The z-index of the parent field, used to resolve overlapping blocks at the
 * same nesting level. Higher values take priority.
 */
export const INJECT_FIELD_Z_INDEX = Symbol(
  'blokkli_field_z_index',
) as InjectionKey<number>

/**
 * Whether we're currently in preview mode.
 */
export const INJECT_IS_PREVIEW = Symbol('blokkli_is_preview') as InjectionKey<
  ComputedRef<boolean>
>

/**
 * Whether the block is rendered inside a from_library block.
 */
export const INJECT_IS_IN_REUSABLE = Symbol(
  'blokkli_is_in_reusable',
) as InjectionKey<boolean>

/**
 * The options provided by the from_library block.
 */
export const INJECT_REUSABLE_OPTIONS = Symbol(
  'blokkli_from_library_options',
) as InjectionKey<
  ComputedRef<Record<string, string | number | boolean | string[] | undefined>>
>

/**
 * The UUID of the parent from_library block.
 */
export const INJECT_REUSABLE_UUID = Symbol(
  'blokkli_from_library_uuid',
) as InjectionKey<string>

/**
 * The field list type of the parent field.
 */
export const INJECT_FIELD_LIST_TYPE = Symbol(
  'blokkli_field_list_type',
) as InjectionKey<ComputedRef<ValidFieldListTypes>>

/**
 * The field list items of the containing block.
 */
export const INJECT_FIELD_LIST_BLOCKS = Symbol(
  'blokkli_field_list_blocks',
) as InjectionKey<ComputedRef<FieldListItemTyped[]>>

/**
 * Whether the parent field is rendering in proxy mode.
 */
export const INJECT_FIELD_PROXY_MODE = Symbol(
  'blokkli_field_proxy_mode',
) as InjectionKey<boolean>

/**
 * Whether the parent field is rendering in proxy mode.
 *
 * @todo: This is probably the ssame as INJECT_FIELD_PROXY_MODE.
 */
export const INJECT_FIELD_USES_PROXY = Symbol(
  'blokkli_field_uses_proxy',
) as InjectionKey<boolean>

/**
 * Whether the global proxy mode setting is enabled in the editor.
 */
export const INJECT_GLOBAL_PROXY_MODE = Symbol(
  'blokkli_global_proxy_mode',
) as InjectionKey<ComputedRef<boolean>>

/**
 * The blocks of the root field.
 */
export const INJECT_PROVIDER_BLOCKS = Symbol(
  'blokkli_provider_blocks',
) as InjectionKey<ComputedRef<FieldListItemTyped[]>>

/**
 * The item data provided by BlokkliItem.
 */
export const INJECT_BLOCK_ITEM = Symbol('blokkli_block_item') as InjectionKey<
  ComputedRef<InjectedBlokkliItem>
>

/**
 * The mutated fields map provided in the editor.
 *
 * This is a reactive property with an objected keyed by field list key.
 */
export const INJECT_MUTATED_FIELDS_MAP = Symbol(
  'blokkli_mutated_fields_map',
) as InjectionKey<Record<string, MutatedField | undefined>>

/**
 * The current "entity context".
 *
 * For blocks rendered directly within the first BlokkliField inside BlokkliProvider, the entity is the provider.
 * For nested blocks, the entity context will be the block that contains nested blocks.
 */
export const INJECT_ENTITY_CONTEXT = Symbol(
  'blokkli_entity_context',
) as InjectionKey<EntityContext>

/**
 * The current provider type.
 */
export const INJECT_PROVIDER_TYPE = Symbol(
  'blokkli_provider_type',
) as InjectionKey<ValidProviderTypes>

/**
 * The entity context of the provider.
 */
export const INJECT_PROVIDER_CONTEXT = Symbol(
  'blokkli_provider_context',
) as InjectionKey<ComputedRef<BlokkliProviderEntityContext>>

/**
 * The defineBlokkli context of the "blokkli_fragment" block.
 */
export const INJECT_FRAGMENT_CONTEXT = Symbol(
  'blokkli_fragment_context',
) as InjectionKey<DefineBlokkliContext<any, any>>

/**
 * The unique key of the current provider.
 */
export const INJECT_PROVIDER_KEY = Symbol(
  'blokkli_provider_key',
) as InjectionKey<string>

/**
 * The DraggableList component used during editing.
 */
export const INJECT_EDIT_FIELD_LIST_COMPONENT = Symbol(
  'blokkli_edit_field_list_component',
) as InjectionKey<typeof DraggableListComponent>

/**
 * The BlokkliEditableEdit component used during editing.
 */
export const INJECT_EDIT_EDITABLE_COMPONENT = Symbol(
  'blokkli_edit_editable_component',
) as InjectionKey<typeof BlokkliEditableEditComponent>

/**
 * The reactive item props override object, used to override props values (during editing).
 */
export const INJECT_ITEM_PROPS_OVERRIDE = Symbol(
  'blokkli_edit_item_props_override',
) as InjectionKey<MutatedItemProps>

/**
 * The debug logger instance.
 */
export const INJECT_EDIT_LOGGER = Symbol(
  'blokkli_edit_logger',
) as InjectionKey<DebugLogger>

/**
 * An object containing block item component keys as properties and the Vue component as values.
 *
 * Used to prevent async loading of components in the editor.
 */
export const INJECT_ALL_COMPONENTS_CHUNK = Symbol(
  'blokkli_all_components_chunk',
) as InjectionKey<Record<string, Component>>
