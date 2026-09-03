import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import type { BlocksProvider } from '#blokkli/editor/providers/blocks'
import type { DefinitionProvider } from '#blokkli/editor/providers/definition'
import type { DomProvider } from '#blokkli/editor/providers/dom'
import type {
  FieldValueProvider,
  TextFieldValue,
} from '#blokkli/editor/providers/fieldValue'
import type { StateProvider } from '#blokkli/editor/providers/state'
import type { ReadabilityProvider } from '#blokkli/editor/providers/readability'
import type { TextProvider } from '#blokkli/editor/providers/texts'
import type { MutatedField, Validation } from '#blokkli/editor/types/state'
import type { EntityContext } from '#blokkli/types'
import type { BlockDefinitionOptionsInput } from '#blokkli/types/definitions'
import {
  getAvailableOptions,
  getMutatedOptionValue,
} from '#blokkli/editor/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'
import type {
  AnalyzeCategory,
  AnalyzeNode,
  AnalyzeResult,
  AnalyzeStatus,
} from '../types'
import { collectTextElements, type TextElement } from './collectTextElements'
import { isSkipped } from './skip'

/**
 * The resolved runtime value of a block option.
 */
export type BlockOptionValue = ReturnType<typeof getRuntimeOptionValue>

export class AnalyzerContext {
  public readonly mutatedFields: Readonly<MutatedField[]>

  /**
   * Backend-reported validation violations for the current state.
   */
  public readonly violations: Readonly<Validation[]>

  /**
   * The readability provider.
   */
  public readonly readability: ReadabilityProvider

  /**
   * The collected text elements.
   */
  private textElements: Readonly<TextElement[]> | null = null

  /**
   * The text field values, read lazily on first access.
   */
  private textFieldValues: Readonly<TextFieldValue[]> | null = null

  /**
   * The text field values with rendered values, read lazily on first access.
   */
  private processedTextFieldValues: Readonly<TextFieldValue[]> | null = null

  constructor(
    public readonly langcode: string,
    public readonly interfaceLangcode: string,
    public readonly providerRootElement: HTMLElement,
    private state: StateProvider,
    public readonly $t: TextProvider,
    public readonly signal: AbortSignal | undefined,
    readability: ReadabilityProvider,
    /**
     * The edited host entity. Its own text fields appear in
     * `getTextFieldValues()` under this UUID, all other rows belong to blocks.
     */
    public readonly entity: EntityContext,
    private fieldValue: FieldValueProvider,
    private dom: DomProvider,
    private blocks: BlocksProvider,
    private definitions: DefinitionProvider,
  ) {
    this.readability = readability
    this.mutatedFields = JSON.parse(JSON.stringify(state.mutatedFields.value))
    this.violations = JSON.parse(JSON.stringify(state.violations.value))
  }

  /**
   * Get the field list item for a block UUID.
   */
  public getFieldListItem(uuid: string): FieldListItemTyped | undefined {
    return this.state.getFieldListItem(uuid) as FieldListItemTyped | undefined
  }

  /**
   * Whether the element is, or is inside, an element with the
   * `bk-skip-analyze` class. Analyzers should not report such elements.
   */
  public isSkipped(element: Element): boolean {
    return isSkipped(element)
  }

  /**
   * Query the provider root element, excluding elements that opted out of
   * analysis via the `bk-skip-analyze` class.
   */
  public querySelectorAll<T extends Element = HTMLElement>(
    selector: string,
  ): T[] {
    return [...this.providerRootElement.querySelectorAll<T>(selector)].filter(
      (element) => !isSkipped(element),
    )
  }

  /**
   * The root element of the rendered block, or undefined if the block is not
   * rendered.
   */
  public getBlockElement(uuid: string): HTMLElement | undefined {
    return this.dom.registeredBlocks.value[uuid]
  }

  /**
   * The UUID of the block that renders this element, or undefined if the
   * element belongs to the host entity itself and not to any block.
   *
   * For nested blocks this is the innermost block, so comparing the result
   * with a block's UUID tells whether the block renders the element itself
   * or one of its children does.
   */
  public getBlockUuid(element: Element): string | undefined {
    const block = element.closest('[data-bk-uuid]')
    return block instanceof HTMLElement ? block.dataset.bkUuid : undefined
  }

  /**
   * All block UUIDs in the current state, optionally filtered by bundle.
   */
  public getAllUuids(bundle?: string): string[] {
    return this.state.getAllUuids(bundle)
  }

  /**
   * The blocks directly inside the given entity, in document order.
   *
   * Pass the UUID of a block to get its nested blocks or `entity.uuid` to get
   * the top-level blocks of the page. Grandchildren are not included.
   */
  public getChildBlocks(
    uuid: string,
    fieldName?: string,
  ): FieldListItemTyped[] {
    return this.mutatedFields
      .filter(
        (field) =>
          field.entityUuid === uuid && (!fieldName || field.name === fieldName),
      )
      .flatMap((field) => field.list as FieldListItemTyped[])
  }

  /**
   * The resolved option values of a block, the same values the block's
   * component receives from `defineBlokkli()`. Returns undefined if the block
   * is not rendered.
   */
  public getBlockOptions(
    uuid: string,
  ): Record<string, BlockOptionValue> | undefined {
    const block = this.blocks.getBlock(uuid)
    if (!block) {
      return
    }

    const definition = this.definitions.getBlockDefinition(
      block,
      block.fieldListType,
      block.parentBlockBundle,
    )
    if (!definition) {
      return
    }

    const item = this.state.getFieldListItem(uuid)
    const available = getAvailableOptions(
      definition.options as BlockDefinitionOptionsInput | undefined,
      definition.globalOptions as string[] | undefined,
      this.definitions.globalOptions.value as Record<string, any>,
    )

    return available.reduce<Record<string, BlockOptionValue>>(
      (acc, { property, option }) => {
        const stored = getMutatedOptionValue(
          this.state.mutatedOptions,
          uuid,
          property,
          item?.options?.[property] ?? option.default,
        )
        acc[property] = getRuntimeOptionValue(option, stored)
        return acc
      },
      {},
    )
  }

  /**
   * Returns an array of all text elements inside the provider root element.
   *
   * A 'text element' is defined as the lowest block element that contains text.
   * For example, a structure like `<p><span>Foobar</span> <strong>Test</strong></p>`
   * would return as a single text element containing "Foobar Test".
   */
  public getTextElements(): Readonly<TextElement[]> {
    if (!this.textElements) {
      this.textElements = collectTextElements(this.providerRootElement)
    }

    return this.textElements
  }

  /**
   * Returns the text field values of the current state.
   *
   * By default these are the values as the editor stores them, NOT as the page
   * renders them. A CMS renders text fields through filters (link rewriting,
   * typographic transforms, ...), so an analyzer that has to know what is
   * actually persisted must read these instead of the DOM. Pass
   * `{ processed: true }` to get the same fields with their rendered values
   * instead, e.g. to compare stored and rendered markup.
   *
   * The host entity's own fields are listed under `entity.uuid`.
   *
   * Each variant is read once per context and cached, so one analyzer run
   * sees a consistent snapshot.
   */
  public getTextFieldValues(options?: {
    processed?: boolean
  }): Readonly<TextFieldValue[]> {
    if (!this.textFieldValues) {
      this.textFieldValues = this.fieldValue.getTextFieldValues()
    }

    if (!options?.processed) {
      return this.textFieldValues
    }

    if (!this.processedTextFieldValues) {
      this.processedTextFieldValues = this.textFieldValues.map((field) => ({
        ...field,
        value: this.fieldValue.readValue(
          field.entityType,
          field.uuid,
          field.entityBundle,
          field.fieldName,
          field.fieldType,
        ),
      }))
    }

    return this.processedTextFieldValues
  }

  /**
   * Read the raw (stored) value of a single editable text field on a block or
   * the host entity. Returns null if the field is not an editable text field.
   */
  public readRawValue(host: EntityContext, fieldName: string): string | null {
    const fieldType = this.fieldValue.resolveFieldType(
      host.type,
      host.bundle,
      fieldName,
    )
    if (!fieldType) {
      return null
    }

    return this.fieldValue.readRawValue(
      host.type,
      host.uuid,
      host.bundle,
      fieldName,
      fieldType,
    )
  }

  public defineResult(
    id: string,
    title: string,
    category: AnalyzeCategory,
    description: string,
    status: AnalyzeStatus,
    nodes: AnalyzeNode | AnalyzeNode[] = [],
  ): AnalyzeResult {
    return {
      id,
      title,
      category,
      description,
      status,
      nodes,
    }
  }
}
