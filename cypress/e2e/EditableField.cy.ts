describe('The "EditableField" feature', () => {
  it('opens the popup when doubleclicking a field', () => {
    cy.bkOpen().bkAddNewBlock('text').bkCloseEditableFieldForm().wait(1000)

    cy.bkGetFirstBlockOfBundle('text')
      .find('[data-blokkli-editable-field="text"]')
      .trigger('dblclick')

    cy.get('.bk-editable-field').shouldBeVisible()
    cy.get('.bk-editable-field').within(() => {
      cy.contains('Text » Text')
    })
    cy.get('.bk-editable-field iframe')
      .bkGetIframeDocument()
      .get('.ck')
      .should('not.be.undefined')
  })
})
