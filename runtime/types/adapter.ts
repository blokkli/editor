import {
  PbAllowedBundle,
  PbAvailableFeatures,
  PbComment,
  PbConversion,
  PbEditState,
  PbType,
} from '.'
import {
  AddClipboardParagraphEvent,
  AddNewParagraphEvent,
  AddReusableParagraphEvent,
  ImportFromExistingEvent,
  MakeReusableEvent,
  MoveMultipleParagraphsEvent,
  MoveParagraphEvent,
  ParagraphConvertEvent,
  UpdateParagraphOptionEvent,
} from '../components/Edit/types'

interface MutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

export interface PbAdapter<T> {
  // Queries.
  loadState(langcode?: string | undefined | null): Promise<T | undefined>
  getAvailableFeatures(): Promise<PbAvailableFeatures>
  getAllParagraphTypes(): Promise<PbType[]>
  getAvailableParagraphTypes(): Promise<PbAllowedBundle[]>
  getConversions(): Promise<PbConversion[]>

  // Mappers.
  mapState(state: T): PbEditState

  // Mutations.
  addNewParagraph(e: AddNewParagraphEvent): Promise<MutationResponseLike<T>>
  updateParagraphOptions(
    options: UpdateParagraphOptionEvent[],
  ): Promise<MutationResponseLike<T>>
  addClipboardParagraph(
    e: AddClipboardParagraphEvent,
  ): Promise<MutationResponseLike<T>> | undefined
  moveParagraph(e: MoveParagraphEvent): Promise<MutationResponseLike<T>>
  moveMultipleParagraphs(
    e: MoveMultipleParagraphsEvent,
  ): Promise<MutationResponseLike<T>>
  addReusableParagraph(
    e: AddReusableParagraphEvent,
  ): Promise<MutationResponseLike<T>>
  deleteParagraph(uuid: string): Promise<MutationResponseLike<T>>
  deleteMultipleParagraphs(uuids: string[]): Promise<MutationResponseLike<T>>
  convertParagraphs(
    uuids: string[],
    targetBundle: string,
  ): Promise<MutationResponseLike<T>>
  duplicateParagraphs(uuids: string[]): Promise<MutationResponseLike<T>>
  makeParagraphReusable(e: MakeReusableEvent): Promise<MutationResponseLike<T>>
  importFromExisting(
    e: ImportFromExistingEvent,
  ): Promise<MutationResponseLike<T>>
  revertAllChanges(): Promise<MutationResponseLike<T>>
  publish(): Promise<MutationResponseLike<T>>
  undo(): Promise<MutationResponseLike<T>>
  redo(): Promise<MutationResponseLike<T>>
  setHistoryIndex(index: number): Promise<MutationResponseLike<T>>
  takeOwnership(): Promise<MutationResponseLike<T>>

  loadComments(): Promise<PbComment[]>
  addComment(paragraphUuid: string, body: string): Promise<PbComment[]>
  resolveComment(uuid: string): Promise<PbComment[]>
}
