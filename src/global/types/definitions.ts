import type { BlockOptionDefinitionBase } from './blockOptions'

export type BlockDefinitionOptionsInputBase = {
  [key: string]: BlockOptionDefinitionBase
}

export type BlokkliDefinitionAddBehaviour =
  | 'no-form'
  | 'form'
  | `editable:${string}`
  | `complex-option:${string}`

export type BlockDefinitionRenderForParentBase<
  BundleWithNested extends string = string,
> = {
  parentBundle: BundleWithNested
}

export type BlockDefinitionRenderForFieldListBase<
  FieldListTypes extends string = string,
> = {
  /**
   * @deprecated Use `fieldListType` instead.
   */
  fieldList: FieldListTypes
}

export type BlockDefinitionRenderForFieldListTypeBase<
  FieldListTypes extends string = string,
> = {
  fieldListType: FieldListTypes
}

export type BlockDefinitionRenderForProviderTypeBase<
  ProviderType extends string = string,
> = {
  providerType: ProviderType
}

export type PropsFieldMapping = {
  type: 'editable' | 'droppable' | 'field'
  name: string
}

export type BlockDefinitionRenderForBase<
  BundleWithNested extends string = string,
  FieldListTypes extends string = string,
  ProviderType extends string = string,
> =
  | BlockDefinitionRenderForParentBase<BundleWithNested>
  | BlockDefinitionRenderForFieldListBase<FieldListTypes>
  | BlockDefinitionRenderForFieldListTypeBase<FieldListTypes>
  | BlockDefinitionRenderForProviderTypeBase<ProviderType>

export type BlokkliDefinitionInputEditorBase<
  Options extends BlockDefinitionOptionsInputBase =
    BlockDefinitionOptionsInputBase,
  Icon extends string = string,
  PropsType = Record<string, any>,
> = {
  /**
   * The icon rendered in the editor.
   */
  icon?: Icon

  /**
   * Determine which options should be visible in the editor based on the
   * given context.
   *
   * If a method is defined, it is called whenever any of the options change.
   */
  determineVisibleOptions?: (ctx: any) => Array<keyof Options | string>

  /**
   * Disable editing for blocks that don't have any editable fields.
   *
   * This disables the "Edit" button in the actions overlay and double click
   * to edit.
   */
  disableEdit?: boolean

  /**
   * If set, if this block is being rendered standalone (e.g. when inside the
   * "add to library" dialog), the given will be used as the root width. The
   * rendered block is then scaled down so that it fits the available space.
   */
  previewWidth?: number

  /**
   * When set to true the preview in the library is not rendered.
   *
   * This should be used for complex components that render things like sliders,
   * iframes, modals, etc.
   */
  noPreview?: boolean

  /**
   * A background color class that is applied during editing when the component
   * is being displayed standalone in a preview.
   *
   * For example, when the block can be made reusable and is being disabled in
   * the "Add from Library" dialog, the given background class is used on the
   * parent element.
   *
   * This can be used for blocks that render white text and are always
   * rendered on top of a black background. Defining a background class makes
   * sure the text is visible for the user.
   */
  previewBackgroundClass?: string

  /**
   * Define the behaviour when a new block is added of this type.
   *
   * Possible options:
   * - 'form' (default)
   *    Shows the full form to enter block values.
   * - 'no-form'
   *    Immediately adds the block without showing the full form.
   * - 'editable:${string}'
   *    Immediately add the block without showing the full form and
   *    immediately open the editable field form with the given name.
   *    For example, when the block has an editable field named "body"
   *    a possible value would be 'editable:body'.
   */
  addBehaviour?: BlokkliDefinitionAddBehaviour

  /**
   * Define a custom title for this block at runtime in the editor.
   *
   * The title will be displayed to the editor to give some context. E.g. a
   * title block displays an excerpt from the title.
   *
   * If a method is provided, it receives the root element of this component
   * and should return a fitting title.
   *
   * If no method is defined or it doesn't return a value, the regular label
   * of the bundle (e.g. "Teaser") is displayed.
   */
  editTitle?: (el: HTMLElement) => string | undefined | null

  /**
   * Build mock props for this component that are used when this block can
   * be added from clipboard or search text content.
   *
   * The props are then used to render a preview of the block.
   *
   * For example, when pasting text into the editor and if supported by the
   * adapter, the clipboard text content is passed as an argument.
   */
  mockProps?: (text?: string) => Record<string, any>

  /**
   * Hides the block from the add list if more than the given amount of
   * blocks aready exist on the page.
   *
   * Note this only affects the behaviour in the editor, it's still possible
   * to have more blocks on the page, just not via the editor.
   */
  maxInstances?: number

  /**
   * Get the drag element for the editor.
   *
   * @deprecated Use a ref in the template to designate the draggable element (e.g. <div ref="blokkliDraggable">).
   */
  getDraggableElement?: (el: HTMLElement) => Element | undefined | null

  /**
   * Define how the nested fields should be structured when the block is
   * rendered without its component, for example when using
   * `:proxy-mode="true"` on <BlokkliField>.
   *
   * Each array should define an array of field names.
   *
   * @example
   * ```typescript
   * defineBlokkli({
   *   bundle: 'three_columns',
   *   editor: {
   *     fieldLayout: [
   *       ['header'],
   *       ['left', 'center', 'right'],
   *     ]
   *   }
   * })
   * ```
   */
  fieldLayout?: string[][]

  /**
   * Define how this component's props should be rendered in the diff view.
   *
   * By default, the diff feature assumes all props to be text and will render
   * plaintext props as HTML and convert complex props (such as arrays or objects)
   * to string using JSON.stringify().
   *
   * You can instead return a string representation of each prop that is used
   * to display the prop instead.
   *
   * For example, if the prop is an image, you may return the filename of the
   * image instead. If the prop is a number, you can return the formatted number.
   *
   * You can also return HTML as the value. The feature uses an HTML differ to
   * render the diff.
   */
  mapDiffProps?: (props?: PropsType) => Record<string, string>
}

export type BlockDefinitionInputBase<
  Options extends BlockDefinitionOptionsInputBase =
    BlockDefinitionOptionsInputBase,
  GlobalOptions extends string[] | undefined = string[],
  Bundle extends string = string,
  ChunkNames extends string = string,
  BundleWithNested extends string = string,
  FieldListTypes extends string = string,
  Icon extends string = string,
  BundlePropsMap extends Record<string, Record<string, any>> = Record<
    string,
    Record<string, any>
  >,
  ProviderTypes extends string = string,
> = {
  /**
   * The bundle ID of the block, e.g. "text" or "section_title".
   */
  bundle: Bundle

  /**
   * Define the name of a block bundle that supports nested blocks.
   * If a bundle is defined, then this component will be rendered if the
   * parent matches the given bundle.
   */
  renderFor?:
    | BlockDefinitionRenderForBase<
        BundleWithNested,
        FieldListTypes,
        ProviderTypes
      >
    | BlockDefinitionRenderForBase<
        BundleWithNested,
        FieldListTypes,
        ProviderTypes
      >[]

  /**
   * The name of the chunk group.
   *
   * If this value is set, the component will be assigned to this
   * import chunk. Multiple components can have the same chunk name.
   *
   * See the `chunkNames` option on the module's configuration for more details.
   */
  chunkName?: ChunkNames

  /**
   * Define options available for this block.
   */
  options?: Options

  /**
   * Global options to use.
   *
   * These options will be merged with the component-specific options.
   */
  globalOptions?: GlobalOptions

  /**
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditorBase<
    Options,
    Icon,
    Bundle extends keyof BundlePropsMap
      ? BundlePropsMap[Bundle]
      : Record<string, any>
  >

  /**
   * Map which component prop maps to which field name.
   *
   * For example, if the field is named "field_paragraphs_header" and the prop
   * is named "headerParagraphs", you would define it as such:
   *
   * @example
   * ```vue
   * <template>
   *   <div>
   *     <BlokkliField :list="headerParagraphs" name="field_paragraphs_header" />
   *   </div>
   * <template>
   *
   * <script lang="ts" setup>
   * import type { ParagraphTwoColumnsFragment } from '#graphql-operations'
   *
   * defineProps<{
   *   headerParagraphs: ParagraphTwoColumnsFragment['headerParagraphs']
   * }>()
   *
   * defineBlokkli({
   *   bundle: 'section',
   *   propsFieldMapping: {
   *     headerParagraphs: 'field_paragraphs_header',
   *   }
   * })
   * </script>
   * ```
   */
  propsFieldMapping?: Bundle extends keyof BundlePropsMap
    ? Record<keyof BundlePropsMap[Bundle], PropsFieldMapping | null>
    : Record<string, PropsFieldMapping | null>
}

export type FragmentDefinitionInputBase<
  Options extends BlockDefinitionOptionsInputBase =
    BlockDefinitionOptionsInputBase,
  GlobalOptions extends string[] | undefined = string[],
  ChunkNames extends string = string,
  Icon extends string = string,
> = {
  /**
   * The unique name of this fragment.
   */
  name: string

  /**
   * The label of the fragment.
   */
  label: string

  /**
   * A short description.
   */
  description?: string

  /**
   * The name of the chunk group.
   *
   * If this value is set, the component will be assigned to this
   * import chunk. Multiple components can have the same chunk name.
   *
   * See the `chunkNames` option on the module's configuration for more details.
   */
  chunkName?: ChunkNames

  /**
   * Define options available for this block.
   */
  options?: Options

  /**
   * Global options to use.
   *
   * These options will be merged with the component-specific options.
   */
  globalOptions?: GlobalOptions

  /**
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditorBase<Options, Icon>
}

export type ProviderDefinitionInputBase<
  Options extends BlockDefinitionOptionsInputBase =
    BlockDefinitionOptionsInputBase,
  GlobalOptions extends string[] | undefined = string[],
> = {
  /**
   * The entity type.
   */
  entityType: string

  /**
   * The bundle.
   */
  bundle: string

  /**
   * Define options available for this block.
   */
  options?: Options

  /**
   * Global options to use.
   *
   * These options will be merged with the component-specific options.
   */
  globalOptions?: GlobalOptions

  propsFieldMapping?: Record<string, PropsFieldMapping | null>
}


