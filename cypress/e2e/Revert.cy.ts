describe('The Revert feature', () => {
  it('discards all changes', () => {
    cy.bkOpen()
    cy.bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()

    cy.bkOpenMenu().bkClickMenuButton('revert')

    cy.bkWithinDialog(() => {
      cy.get('button.bk-is-danger').click()
    })

    cy.bkAssertMessage('All changes have been discarded.', 'success')

    cy.bkGetAllBlocks().should('not.exist')
  })
})
