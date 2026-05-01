import type { ComputedRef } from 'vue'
import type { BlockOptionDefinition } from './blockOptions'
import type { AdapterContext } from '../editor/adapter'
import type {
  BlockBundleWithNested,
  FieldListItemTyped,
  GlobalOptionsKey,
  ValidChunkNames,
  ValidFieldListTypes,
  ValidGlobalConfigKeys,
  BundleProps,
  ValidProviderTypes,
} from '#blokkli-build/generated-types'
import type {
  BlockDefinitionInputBase,
  BlockDefinitionRenderForBase,
  BlockDefinitionRenderForFieldListBase,
  BlockDefinitionRenderForFieldListTypeBase,
  BlockDefinitionRenderForParentBase,
  BlockDefinitionRenderForProviderTypeBase,
  BlokkliDefinitionInputEditorBase,
  FragmentDefinitionInputBase,
  ProviderDefinitionInputBase,
} from './../../global/types/definitions'

import type { GlobalOptionsType } from '#blokkli-build/definitions'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { ComplexOptionTypeMap } from '#blokkli-build/complex-option-types'
import type { BlokkliProviderEntityContext } from './provider'

type GetType<T> = T extends { options: infer O }
  ? T extends { type: 'checkboxes' }
    ? Array<keyof O>
    : keyof O
  : T extends { type: 'checkbox' }
    ? boolean
    : T extends { type: 'range' }
      ? number
      : T extends { type: 'number'; nullable: true }
        ? number | undefined
        : T extends { type: 'number' }
          ? number
          : T extends { type: 'json'; dataType: infer D }
            ? D extends keyof ComplexOptionTypeMap
              ? ComplexOptionTypeMap[D]
              : any
            : T extends { type: 'json' }
              ? any
              : string

export type BlockDefinitionOptionsInput = {
  [key: string]: BlockOptionDefinition
}

type WithOptions<T extends BlockDefinitionOptionsInput> = {
  [K in keyof T]: GetType<T[K]>
}

type GlobalOptionsKeyTypes<T extends ValidGlobalConfigKeys> = {
  [K in T[number]]: GetType<GlobalOptionsType[K]>
}

export type BundleKey = keyof BundleProps

export type DefineBlokkliContext<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends ValidGlobalConfigKeys | undefined = undefined,
> = {
  /**
   * The UUID of the item.
   */
  uuid: string

  /**
   * The index of the item in the field list.
   */
  index: ComputedRef<number>

  /**
   * Whether the item is being displayed in an editing context.
   *
   * Use `import.meta.blokkliEditing` instead, which will only
   * include "editing related code" in the editor bundle and remove it from
   * the main ("public") bundle.
   *
   * @deprecated
   */
  isEditing: boolean

  /**
   * The item type name (e.g. "teaser_list") of the parent item if this item is nested.
   */
  parentType: ComputedRef<BlockBundleWithNested | undefined>

  /**
   * The type of the field list the item is part of.
   */
  fieldListType: ComputedRef<ValidFieldListTypes>

  /**
   * All sibling blocks (including this one) that are in the same field.
   */
  siblings: ComputedRef<FieldListItemTyped[]>

  /**
   * All blocks that are in the root field (direct child of <BlokkliProvider>).
   */
  rootBlocks: ComputedRef<FieldListItemTyped[]>

  /**
   * The reactive runtime options.
   *
   * This includes both the locally defined options and the inherited global
   * options.
   */
  options: ComputedRef<
    (T extends BlockDefinitionOptionsInput ? WithOptions<T> : object) &
      (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : object)
  >

  /**
   * The provider context.
   */
  provider: ComputedRef<BlokkliProviderEntityContext | null>

  /**
   * Whether the block is currently selected in the editor. Only available during editing.
   */
  isSelected?: ComputedRef<boolean>
}

export type DefineProviderContext<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends ValidGlobalConfigKeys | undefined = undefined,
> = {
  /**
   * The reactive runtime options.
   *
   * This includes both the locally defined options and the inherited global
   * options.
   */
  options: ComputedRef<
    (T extends BlockDefinitionOptionsInput ? WithOptions<T> : object) &
      (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : object)
  >
}

type DetermineVisibleOptionsContext<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
  B extends BundleKey | string = string,
> = {
  options: (T extends BlockDefinitionOptionsInput ? WithOptions<T> : object) &
    (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : object)
  parentType: BlockBundleWithNested | undefined
  fieldListType: ValidFieldListTypes
  props: B extends BundleKey ? BundleProps[B] : Record<string, any>
  entity: AdapterContext
}

type ExtractGlobalOptions<G extends GlobalOptionsKey[]> =
  G[number] extends GlobalOptionsKey ? G[number] : never

type CombineKeysAndGlobalOptions<
  T extends BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined,
> = keyof T | ExtractGlobalOptions<NonNullable<G>>

export type BlokkliDefinitionInputEditor<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
  Bundle extends BundleKey | string = string,
  PropsType = Bundle extends BundleKey
    ? BundleProps[Bundle]
    : Record<string, any>,
> = Omit<
  BlokkliDefinitionInputEditorBase<Options, BlokkliIcon, PropsType>,
  'determineVisibleOptions'
> & {
  /**
   * Determine which options should be visible in the editor based on the
   * given context.
   *
   * If a method is defined, it is called whenever any of the options change.
   */
  determineVisibleOptions?: (
    ctx: DetermineVisibleOptionsContext<Options, GlobalOptions, Bundle>,
  ) => Array<CombineKeysAndGlobalOptions<Options, GlobalOptions>>
}

export type BlockDefinitionRenderForParent =
  BlockDefinitionRenderForParentBase<BlockBundleWithNested>

export type BlockDefinitionRenderForFieldList =
  BlockDefinitionRenderForFieldListBase<ValidFieldListTypes>

export type BlockDefinitionRenderForFieldListType =
  BlockDefinitionRenderForFieldListTypeBase<ValidFieldListTypes>

export type BlockDefinitionRenderForProviderType =
  BlockDefinitionRenderForProviderTypeBase<ValidProviderTypes>

export type BlockDefinitionRenderFor = BlockDefinitionRenderForBase<
  BlockBundleWithNested,
  ValidFieldListTypes,
  ValidProviderTypes
>

export type BlockDefinitionInput<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = [],
  Bundle extends BundleKey | string = string,
> = Omit<
  BlockDefinitionInputBase<
    Options,
    GlobalOptions,
    Bundle,
    ValidChunkNames,
    BlockBundleWithNested,
    ValidFieldListTypes,
    BlokkliIcon,
    BundleProps,
    ValidProviderTypes
  >,
  'editor'
> & {
  /**
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditor<Options, GlobalOptions, Bundle>
}

export type RuntimeBlockDefinitionInput = {
  bundle: string
}

export type FragmentDefinitionInput<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = Omit<
  FragmentDefinitionInputBase<
    Options,
    GlobalOptions,
    ValidChunkNames,
    BlokkliIcon
  >,
  'editor'
> & {
  /**
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditor<Options, GlobalOptions>
}

export type ProviderDefinitionInput<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = ProviderDefinitionInputBase<Options, GlobalOptions>
