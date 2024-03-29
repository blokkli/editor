describe('The "Clipboard" feature', () => {
  it('opens the sidebar when pasting text', () => {
    cy.bkOpen()
    cy.pasteDocument('Foobar')
    cy.get('.bk-sidebar-inner').shouldBeVisible()
  })

  it('correctly displays and adds pasted text', () => {
    const TEXT = 'Pasted text from the clipboard'

    cy.bkOpen()
    cy.pasteDocument(TEXT)

    cy.bkWithinSidebar(() => {
      cy.contains(TEXT)
        .closest('.bk-clipboard-item')
        .contains('Text')
        .closest('.bk-clipboard-item')
        .bkStartItemDrag()
    })

    cy.bkGetDropTargetForUuid('2', 'content').click()

    cy.bkGetFirstBlockOfBundle('text').should('exist').contains(TEXT)
  })

  it('correctly detects a pasted YouTube link', () => {
    const URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

    cy.bkOpen()
    cy.pasteDocument(URL)

    cy.bkWithinSidebar(() => {
      cy.get('[data-clipboard-type="youtube"]')
      cy.get('img').should(
        'have.attr',
        'src',
        'http://i3.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      )
    })
  })

  it('adds a pasted youtube link as a block', () => {
    const URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

    cy.bkOpen()
    cy.pasteDocument(URL)

    cy.bkWithinSidebar(() => {
      cy.get('[data-clipboard-type="youtube"]').bkStartItemDrag()
    })
    cy.bkGetDropTargetForUuid('2', 'content').click()
    cy.bkGetFirstBlockOfBundle('video').should('exist').contains('Rick Astley')
  })
})
