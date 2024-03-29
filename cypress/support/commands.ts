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
Cypress.Commands.add('bkAddNewBlock', (bundle) => {
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

  return cy.get('.bk-drop-targets-field-child').last().click()
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

Cypress.Commands.add('bkGetAllBlocks', () =>
  cy.get('[data-element-type="existing"]'),
)

Cypress.Commands.add('shouldBeVisible', { prevSubject: true }, (element) => {
  // eslint-disable-next-line no-unused-expressions
  expect(element[0].checkVisibility()).to.be.true
})
