import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import type {
  FieldValueProvider,
  TextFieldValue,
} from '#blokkli/editor/providers/fieldValue'
import type { StateProvider } from '#blokkli/editor/providers/state'
import type { ReadabilityProvider } from '#blokkli/editor/providers/readability'
import type { TextProvider } from '#blokkli/editor/providers/texts'
import type { MutatedField, Validation } from '#blokkli/editor/types/state'
import type { EntityContext } from '#blokkli/types'
import type {
  AnalyzeCategory,
  AnalyzeNode,
  AnalyzeResult,
  AnalyzeStatus,
} from '../types'
import { collectTextElements, type TextElement } from './collectTextElements'

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
