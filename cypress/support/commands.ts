Cypress.Commands.add('bkGetAddListItem', (bundle) =>
  cy.get(`#blokkli-add-list-blocks [data-sortli-id="${bundle}"]`),
)

Cypress.Commands.add('bkStartBlockDrag', (bundle) => {
  cy.bkGetAddListItem(bundle)
    .trigger('mousedown', { which: 0 })
    .trigger('mousemove', {
      mouseX: 200,
      mouseY: 200,
      clientX: 200,
      clientY: 200,
      screenX: 200,
      screenY: 200,
      pageX: 200,
      pageY: 200,
    })

  return cy.get('.bk-drop-targets').should('exist')
})
Cypress.Commands.add('bkAddNewBlock', (bundle, first) => {
  cy.bkGetAddListItem(bundle)
    .trigger('mousedown', { which: 0 })
    .trigger('mousemove', {
      mouseX: 200,
      mouseY: 200,
      clientX: 200,
      clientY: 200,
      screenX: 200,
      screenY: 200,
      pageX: 200,
      pageY: 200,
    })

  cy.get('.bk-drop-targets').should('exist')

  if (first) {
    return cy.get('.bk-drop-targets-field-child').first().click()
  }

  return cy.get('.bk-drop-targets-field-child').last().click()
})

Cypress.Commands.add('bkStartItemDrag', { prevSubject: true }, (subject) => {
  return cy
    .wrap(subject)
    .trigger('mousedown', { button: 0 })
    .trigger('mousemove', {
      mouseX: 200,
      mouseY: 200,
      clientX: 200,
      clientY: 200,
      screenX: 200,
      screenY: 200,
      pageX: 200,
      pageY: 200,
    })
})

Cypress.Commands.add('bkOpen', () => {
  cy.visit('http://localhost:3000/page/2?blokkliEditing=2')
  // Close import dialog.
  cy.get('.bk-overlay-header button').click()
  // Close tour popup.
  return cy.get('.bk-tour-popup-close').click()
})

Cypress.Commands.add('bkGetField', (name) =>
  cy.get(`[data-field-key="2:${name}"]`),
)

Cypress.Commands.add('bkGetFirstBlockOfBundle', (bundle) =>
  cy.get(`[data-item-bundle="${bundle}"]`).eq(0),
)

Cypress.Commands.add('bkGetEditableFieldForm', () =>
  cy.get('.bk-editable-field-input'),
)

Cypress.Commands.add('bkCloseEditableFieldForm', () =>
  cy.get('.bk-editable-field-buttons button').eq(0).click(),
)

Cypress.Commands.add('bkGetUuid', { prevSubject: true }, (subject) =>
  cy.wrap(subject).invoke('attr', 'data-uuid'),
)

Cypress.Commands.add('bkGetDropTargetForUuid', (uuid, fieldName) =>
  cy
    .get(`[data-drop-target-field="${uuid}:${fieldName}"]`)
    .find('.bk-drop-targets-field-child')
    .eq(0),
)

Cypress.Commands.add('bkGetAllBlocks', (bundle) => {
  if (bundle) {
    return cy.get(
      `[data-element-type="existing"][data-item-bundle="${bundle}"]`,
    )
  }
  return cy.get('[data-element-type="existing"]')
})

Cypress.Commands.add('shouldBeVisible', { prevSubject: true }, (element) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  expect(element[0].checkVisibility()).to.be.true
  return element
})

Cypress.Commands.add('shouldNotBeVisible', { prevSubject: true }, (element) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  expect(element[0].checkVisibility()).to.be.false
  return element
})

// @ts-ignore
Cypress.Commands.add('bkUnselect', () => cy.get('body').type('{esc}'))

Cypress.Commands.add('bkOpenMenu', () => {
  cy.get('.bk-toolbar-menu-button').click()
  return cy.get('.bk-menu-list-inner')
})

Cypress.Commands.add('bkClickToolbarButton', (id) => {
  return cy.get('.bk-toolbar-button.bk-is-' + id).click()
})

Cypress.Commands.add('bkOpenSettings', () => {
  cy.bkOpenMenu().bkClickMenuButton('settings')
  return cy.get('.bk-dialog-inner')
})

Cypress.Commands.add('bkClickMenuButton', (id: string) => {
  return cy.get('#bk-menu-list-button-' + id).click()
})

Cypress.Commands.add('bkCloseDialog', () => {
  return cy.get('.bk-overlay-header button').click()
})

Cypress.Commands.add('bkWithinDialog', (cb) => {
  return cy.get('.bk-dialog-inner').within(cb)
})

Cypress.Commands.add('bkWithinSidebar', (cb) => {
  return cy.get('.bk-sidebar-inner').within(cb)
})

Cypress.Commands.add('bkAssertMessage', (text, type) => {
  return cy.get('.bk-message.bk-is-' + type).contains(text)
})

Cypress.Commands.add('bkOpenSidebar', (id) => {
  return cy.get('#bk-sidebar-button-' + id).click()
})

Cypress.Commands.add(
  'bkGetIframeDocument',
  // @ts-ignore
  { prevSubject: true },
  (subject) => {
    const getIframeDocument = () => {
      return cy.wrap(subject).its('0.contentDocument').should('exist')
    }

    return getIframeDocument()
      .its('body')
      .should('not.be.undefined')
      .then(cy.wrap)
  },
)

/**
 * usages:
 * cy.paste('text to paste') OR:
 * cy.paste({ pastePayload: 'text to paste', pasteType: 'text/plain' })
 */
Cypress.Commands.add('pasteDocument', (pasteInput) => {
  const pasteType = 'text/plain'

  const clipboardData = new DataTransfer()
  clipboardData.setData(pasteType, pasteInput)

  cy.get('body').trigger('paste', {
    clipboardData,
  })
})
