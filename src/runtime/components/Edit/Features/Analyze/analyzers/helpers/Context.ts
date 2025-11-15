import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import type { StateProvider } from '#blokkli/helpers/stateProvider'
import type { TextProvider } from '#blokkli/helpers/textProvider'
import type { MutatedField } from '#blokkli/types'
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
   * The collected text elements.
   */
  private textElements: Readonly<TextElement[]> | null = null

  constructor(
    public readonly langcode: string,
    public readonly interfaceLangcode: string,
    public readonly providerRootElement: HTMLElement,
    private state: StateProvider,
    public readonly $t: TextProvider,
    public readonly signal?: AbortSignal,
  ) {
    this.mutatedFields = JSON.parse(JSON.stringify(state.mutatedFields.value))
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
