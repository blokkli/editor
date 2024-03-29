describe('The "move blocks" feature', () => {
  it('moves a single block', () => {
    cy.bkOpen()
      .bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()

    cy.bkGetAllBlocks().then((blocks) => {
      cy.wrap(blocks.eq(0).attr('data-item-bundle')).should('eq', 'title')
      cy.wrap(blocks.eq(1).attr('data-item-bundle')).should('eq', 'text')
    })

    // Start drag action.
    cy.bkGetFirstBlockOfBundle('text')
      .trigger('mousedown', { which: 0 })
      .trigger('mousemove', {
        clientX: 200,
        clientY: 200,
      })

    // Click on the first drop target.
    cy.get('.bk-drop-targets-field-child').first().click()

    // Assert the block was moved correctly.
    cy.bkGetAllBlocks().then((blocks) => {
      cy.wrap(blocks.eq(0).attr('data-item-bundle')).should('eq', 'text')
      cy.wrap(blocks.eq(1).attr('data-item-bundle')).should('eq', 'title')
    })
  })

  it('moves multiple blocks', () => {
    cy.bkOpen()
      .bkAddNewBlock('card')
      .bkAddNewBlock('card')
      .bkAddNewBlock('card')
      .bkAddNewBlock('card')
      .bkAddNewBlock('card')
      .bkUnselect()
      .bkAddNewBlock('grid', true)
      .bkGetField('content')
      .bkUnselect()
      .bkGetFirstBlockOfBundle('grid')
      .bkGetUuid()
      .then((uuid) => {
        cy.get('body').type('{ctrl}', { release: false })
        cy.bkGetAllBlocks('card').then((blocks) => {
          cy.wrap(blocks.eq(0)).click()
          cy.wait(300)
          cy.wrap(blocks.eq(1)).click()
          cy.wait(300)
          cy.wrap(blocks.eq(2)).click()
          cy.wait(300)
          cy.wrap(blocks.eq(3))
            .click()
            .trigger('mousedown', { which: 0 })
            .trigger('mousemove', {
              clientX: 200,
              clientY: 200,
            })
          cy.bkGetDropTargetForUuid(uuid, 'blocks').click()

          // Four blocks should have been moved inside the grid.
          cy.bkGetFirstBlockOfBundle('grid')
            .find('[data-item-bundle="card"]')
            .should('have.lengthOf', 4)
        })
      })
  })
})
