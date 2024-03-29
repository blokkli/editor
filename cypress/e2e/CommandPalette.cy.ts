describe('The "CommandPalette" feature', () => {
  it('is available via the toolbar', () => {
    cy.bkOpen()
    cy.bkClickToolbarButton('command_palette')

    cy.get('.bk-command-palette').shouldBeVisible()
  })

  it('filters commands by search string', () => {
    cy.bkOpen()
    cy.bkClickToolbarButton('command_palette')

    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('settings')
      cy.get('.bk-command[data-command-visible="true"]').should(
        'have.lengthOf',
        1,
      )
      cy.get('input').clear()
      cy.get('.bk-command[data-command-visible="true"]').should(
        'have.length.gt',
        1,
      )
    })
  })

  it('closes when pressing the escape key', () => {
    cy.bkOpen()
    cy.bkClickToolbarButton('command_palette')

    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('{esc}')
    })
    cy.get('.bk-command-palette').should('not.exist')
  })

  it('selects a command when pressing enter', () => {
    cy.bkOpen()
    cy.bkClickToolbarButton('command_palette')

    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('settings{enter}')
    })
    cy.get('.bk-command-palette').should('not.exist')
    cy.get('.bk-dialog-inner').contains('settings')
  })

  it('finds and executes the delete command', () => {
    cy.bkOpen()
    cy.bkClickToolbarButton('command_palette')

    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('appendtext{enter}')
    })
    cy.bkGetFirstBlockOfBundle('text').should('exist')

    cy.bkClickToolbarButton('command_palette')
    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('delete{enter}')
    })
    cy.wait(300)
    cy.bkGetAllBlocks().should('have.lengthOf', 0)
  })

  it('finds and executes the edit command', () => {
    cy.bkOpen()
    cy.bkClickToolbarButton('command_palette')

    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('appendtext{enter}')
    })

    cy.bkClickToolbarButton('command_palette')
    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('edit{enter}')
    })

    cy.get('.bk-form-overlay').should('exist')
  })

  it('finds and executes the edit editable field command', () => {
    cy.bkOpen()
    cy.bkClickToolbarButton('command_palette')

    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('appendcard{enter}')
    })

    cy.bkClickToolbarButton('command_palette')
    cy.get('.bk-command-palette').within(() => {
      cy.get('input').type('edittagline{enter}')
    })

    cy.get('.bk-editable-field-input').should('exist')
  })
})
