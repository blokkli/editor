describe('The BlockAddList feature', () => {
  it('Adds a new text block', () => {
    cy.bkOpen()
      .bkAddNewBlock('text')
      .bkGetField('content')
      .bkGetFirstBlockOfBundle('text')
  })

  it('Opens the editable field form when enabled', () => {
    cy.bkOpen().bkAddNewBlock('text').bkGetEditableFieldForm()
  })

  it('Adds a new two_columns block', () => {
    cy.bkOpen()
      .bkAddNewBlock('two_columns')
      .bkGetField('content')
      .bkGetFirstBlockOfBundle('two_columns')
      .bkGetUuid()
      .then((uuid) => {
        cy.bkStartBlockDrag('text')
        cy.bkGetDropTargetForUuid(uuid, 'left').click()
      })
      .bkCloseEditableFieldForm()
      .bkStartBlockDrag('image')
      .bkGetFirstBlockOfBundle('two_columns')
      .bkGetUuid()
      .then((uuid) => {
        cy.bkGetDropTargetForUuid(uuid, 'right')
          .click()
          .bkStartBlockDrag('title')
          .bkGetDropTargetForUuid(uuid, 'header')
          .click()
      })
      .bkCloseEditableFieldForm()

    cy.bkGetAllBlocks().should('have.lengthOf', 4)
  })

  it("Disables blocks that can't be placed.", () => {
    cy.bkOpen().bkAddNewBlock('two_columns')
    cy.bkGetAddListItem('grid').should('have.class', 'bk-is-disabled')
  })
})
