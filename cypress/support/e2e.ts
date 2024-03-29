// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

type PossibleBundle =
  | 'text'
  | 'title'
  | 'grid'
  | 'card'
  | 'teaser'
  | 'two_columns'
  | 'widget'
  | 'image'
  | 'video'

declare global {
  namespace Cypress {
    interface Chainable {
      shouldBeVisible(): Chainable<JQuery<HTMLElement>>
      shouldNotBeVisible(): Chainable<JQuery<HTMLElement>>
      bkAddNewBlock(
        bundle: PossibleBundle,
        first?: boolean,
      ): Chainable<JQuery<HTMLElement>>
      bkStartBlockDrag(bundle: PossibleBundle): Chainable<JQuery<HTMLElement>>
      bkOpen(): Chainable<JQuery<HTMLElement>>
      bkGetField(name: string): Chainable<JQuery<HTMLElement>>
      bkGetFirstBlockOfBundle(
        bundle: PossibleBundle,
      ): Chainable<JQuery<HTMLElement>>
      bkGetEditableFieldForm(): Chainable<JQuery<HTMLElement>>
      bkCloseEditableFieldForm(): Chainable<JQuery<HTMLElement>>
      bkGetUuid(): Chainable<string>
      bkGetDropTargetForUuid(
        uuid: string,
        fieldName: string,
      ): Chainable<JQuery<HTMLElement>>
      bkGetAllBlocks(bundle?: PossibleBundle): Chainable<JQuery<HTMLElement>>
      bkGetAddListItem(bundle: PossibleBundle): Chainable<JQuery<HTMLElement>>
      bkGetAddListItem(bundle: PossibleBundle): Chainable<JQuery<HTMLElement>>
      bkUnselect(): Chainable<JQuery<HTMLElement>>
      bkOpenMenu(): Chainable<JQuery<HTMLElement>>
      bkOpenSettings(): Chainable<JQuery<HTMLElement>>
      bkClickMenuButton(id: string): Chainable<JQuery<HTMLElement>>
      bkCloseDialog(): Chainable<JQuery<HTMLElement>>
      bkWithinDialog(cb: () => void): Chainable<JQuery<HTMLElement>>
      bkOpenSidebar(id: string): Chainable<JQuery<HTMLElement>>
      bkWithinSidebar(cb: () => void): Chainable<JQuery<HTMLElement>>
      bkAssertMessage(
        text: string,
        type: 'success' | 'error',
      ): Chainable<JQuery<HTMLElement>>
      pasteDocument(input: string): Chainable<JQuery<HTMLElement>>
      bkStartItemDrag(): Chainable<JQuery<HTMLElement>>
      bkClickToolbarButton(id: string): Chainable<JQuery<HTMLElement>>
      bkGetIframeDocument(): Chainable<JQuery<HTMLElement>>
    }
  }
}
