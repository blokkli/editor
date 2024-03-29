describe('The Selection', () => {
  it('shows a single selected block', () => {
    cy.bkOpen().bkAddNewBlock('two_columns')

    cy.get('.bk-selection').should('exist')
    cy.get('.bk-selection .bk-selectable')
      .should('have.lengthOf', 1)
      .shouldBeVisible()
  })

  it('shows multiple selected blocks', () => {
    cy.bkOpen()
      .bkAddNewBlock('two_columns')
      .bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()

    cy.get('body').type('{esc}')
    cy.get('body').type('{ctrl}', { release: false })
    cy.bkGetFirstBlockOfBundle('text').click()
    cy.wait(500)
    cy.bkGetFirstBlockOfBundle('title').click({ controlKey: true })

    cy.get('.bk-selection .bk-selectable')
      .should('have.lengthOf', 2)
      .shouldBeVisible()
  })
})
