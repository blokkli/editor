import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import type { StateProvider } from '#blokkli/editor/providers/state'
import type { ReadabilityProvider } from '#blokkli/editor/providers/readability'
import type { TextProvider } from '#blokkli/editor/providers/texts'
import type { MutatedField, Validation } from '#blokkli/editor/types/state'
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

  constructor(
    public readonly langcode: string,
    public readonly interfaceLangcode: string,
    public readonly providerRootElement: HTMLElement,
    private state: StateProvider,
    public readonly $t: TextProvider,
    public readonly signal: AbortSignal | undefined,
    readability: ReadabilityProvider,
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
