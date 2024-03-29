describe('The History feature', () => {
  it('is shown in the sidebar pane', () => {
    cy.bkOpen()
    cy.bkOpenSidebar('history')
    cy.get('.bk-sidebar-title').contains('History')
    cy.get('.bk-history-empty-message').should('exist')
  })

  it('renders a message when there are no changes yet', () => {
    cy.bkOpen()
      .bkOpenSidebar('history')
      .get('.bk-history-empty-message')
      .should('exist')
  })

  it('shows the history when there are changes', () => {
    cy.bkOpen().bkOpenSidebar('history')
    cy.bkAddNewBlock('text').bkCloseEditableFieldForm()
    cy.get('.bk-history ul li').should('have.lengthOf', 2)
  })

  it('shows an entry for a state without any mutations', () => {
    cy.bkOpen().bkOpenSidebar('history')
    cy.bkAddNewBlock('text').bkCloseEditableFieldForm()
    cy.get('.bk-history ul li').contains('Current revision')
  })

  it('reverts to a previous state', () => {
    cy.bkOpen().bkOpenSidebar('history')
    cy.bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .wait(1000)
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()
    cy.get('.bk-history ul li')
      .eq(0)
      .should('have.class', 'bk-is-first')
      .should('have.class', 'bk-is-active')

    cy.get('.bk-history ul li').eq(1).should('not.have.class', 'bk-is-active')
    cy.get('.bk-history ul li').eq(1).find('button').click()
    cy.get('.bk-history ul li').eq(0).should('not.have.class', 'bk-is-active')
    cy.get('.bk-history ul li').eq(1).should('have.class', 'bk-is-active')

    cy.wait(500)
    // First block still exists.
    cy.bkGetAllBlocks('text').should('exist')

    // Second added block does not exist anymore.
    cy.bkGetAllBlocks('title').should('not.exist')

    // Go back to original state.
    cy.get('.bk-history ul li').eq(2).find('button').click()
    cy.bkGetAllBlocks().should('not.exist')
  })

  it('does undo and redo using shortcuts', () => {
    cy.bkOpen()
    cy.bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()

    cy.get('body').type('{ctrl}z')
    cy.get('body').type('{ctrl}z')

    cy.bkGetAllBlocks().should('not.exist')

    cy.get('body').type('{ctrl}', { release: false })
    cy.get('body').type('{shift}', { release: false })
    cy.get('body').type('z', { release: false })
    cy.bkGetAllBlocks().should('have.lengthOf', 1)
    cy.get('body').type('z', { release: false })
    cy.bkGetAllBlocks().should('have.lengthOf', 2)
  })

  it('disables toolbar buttons', () => {
    cy.bkOpen()
    cy.bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()

    cy.get('.bk-toolbar-button.bk-is-redo').should('have.attr', 'disabled')
    cy.get('.bk-toolbar-button.bk-is-undo').should('not.have.attr', 'disabled')
    cy.get('.bk-toolbar-button.bk-is-undo').click()
    cy.get('.bk-toolbar-button.bk-is-redo').should('not.have.attr', 'disabled')
    cy.get('.bk-toolbar-button.bk-is-undo').should('not.have.attr', 'disabled')
    cy.get('.bk-toolbar-button.bk-is-undo').click()
    cy.get('.bk-toolbar-button.bk-is-redo').should('not.have.attr', 'disabled')
    cy.get('.bk-toolbar-button.bk-is-undo').should('have.attr', 'disabled')
  })

  it('does undo and redo using back/forward mouse buttons', () => {
    cy.bkOpen()
    cy.bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()

    // Undo.
    cy.get('body').trigger('mouseup', { button: 3 })

    // Second added block does not exist anymore.
    cy.bkGetAllBlocks('title').should('not.exist')

    // Undo.
    cy.get('body').trigger('mouseup', { button: 3 })

    // No blocks exist anymore.
    cy.bkGetAllBlocks().should('not.exist')

    // Redo.
    cy.get('body').trigger('mouseup', { button: 4 })
    cy.get('body').trigger('mouseup', { button: 4 })

    // All blocks exist again.
    cy.bkGetAllBlocks().should('have.lengthOf', 2)
  })

  it('respects the setting to not override back/forward mouse behaviour', () => {
    cy.bkOpen()
    cy.bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()

    // Undo twice.
    cy.get('body').trigger('mouseup', { button: 3 })
    cy.get('body').trigger('mouseup', { button: 3 })

    // No blocks exist anymore.
    cy.bkGetAllBlocks().should('not.exist')

    cy.bkOpenSettings()
    cy.get('.bk-checkbox-toggle')
      .contains('Use mouse buttons for undo/redo')
      .closest('label')
      .click()
    cy.bkCloseDialog()

    // Redo.
    cy.get('body').trigger('mouseup', { button: 4 })
    cy.get('body').trigger('mouseup', { button: 4 })

    // Still no blocks exist because it didn't redo.
    cy.bkGetAllBlocks().should('not.exist')
  })
})
