describe('The Options feature', () => {
  const assertOptionValue = (option: string, value: string) => {
    cy.get('[data-item-bundle="widget"] table')
      .contains(option)
      .closest('tr')
      .find('td')
      .eq(1)
      .contains(value)
  }

  it('Shows all available options in the right order', () => {
    cy.bkOpen().bkAddNewBlock('widget')

    cy.get('.bk-blokkli-item-actions-inner').shouldBeVisible()
    cy.get('.bk-blokkli-item-options-item').eq(0).contains('Show all options')
    cy.get('.bk-blokkli-item-options-item').eq(1).contains('Columns')
    cy.get('.bk-blokkli-item-options-item').eq(2).contains('Countries')
    cy.get('.bk-blokkli-item-options-item').eq(3).contains('Anchor ID')
    cy.get('.bk-blokkli-item-options-item').eq(4).contains('Button Type')
    cy.get('.bk-blokkli-item-options-item').eq(5).contains('Columns')
    cy.get('.bk-blokkli-item-options-item').eq(6).contains('Color')
    cy.get('.bk-blokkli-item-options-item').eq(7).contains('Background')
  })

  it('renders the checkbox option correctly', () => {
    cy.bkOpen().bkAddNewBlock('widget')

    assertOptionValue('showAllOptions', 'true')
    cy.get('.bk-blokkli-item-options-item')
      .eq(0)
      .find('input')
      .should('be.checked')
    cy.get('.bk-blokkli-item-options-item').eq(0).click()
    cy.get('.bk-blokkli-item-options-item')
      .eq(0)
      .find('input')
      .should('not.be.checked')

    assertOptionValue('showAllOptions', 'false')
  })

  it('renders the radio option correctly', () => {
    cy.bkOpen().bkAddNewBlock('widget')

    assertOptionValue('columns', '"two"')
    cy.get('.bk-blokkli-item-options-item')
      .eq(1)
      .find('[value="two"]')
      .should('be.checked')

    cy.get('.bk-blokkli-item-options-item')
      .eq(1)
      .find('[value="three"]')
      .check({ force: true })
    assertOptionValue('columns', '"three"')
  })

  it('renders the checkboxes option correctly', () => {
    cy.bkOpen().bkAddNewBlock('widget')

    assertOptionValue('countries', '["ch","de","at"]')
    cy.get('.bk-blokkli-item-options-item')
      .eq(2)
      .find('button')
      .within(() => {
        cy.get('.bk-pill').eq(0).contains('ch')
        cy.get('.bk-pill').eq(1).contains('de')
        cy.get('.bk-pill').eq(2).contains('at')
      })
      .click({ force: true })

    cy.get('.bk-blokkli-item-options-checkboxes-dropdown').shouldBeVisible()
    cy.get('.bk-blokkli-item-options-checkboxes-dropdown')
      .find('input[value="ch"]')
      .should('be.checked')

    cy.get('.bk-blokkli-item-options-checkboxes-dropdown')
      .find('input[value="de"]')
      .should('be.checked')

    cy.get('.bk-blokkli-item-options-checkboxes-dropdown')
      .find('input[value="at"]')
      .should('be.checked')

    cy.get('.bk-blokkli-item-options-checkboxes-dropdown')
      .find('input[value="it"]')
      .should('not.be.checked')

    cy.get('.bk-blokkli-item-options-checkboxes-dropdown')
      .find('input[value="fr"]')
      .should('not.be.checked')

    cy.get('.bk-blokkli-item-options-checkboxes-dropdown')
      .find('input[value="fr"]')
      .check({ force: true })

    cy.get('.bk-blokkli-item-options-checkboxes-dropdown')
      .find('input[value="ch"]')
      .uncheck({ force: true })

    cy.get('.bk-blokkli-item-options-item')
      .eq(2)
      .find('button')
      .within(() => {
        cy.get('.bk-pill').eq(0).contains('de')
        cy.get('.bk-pill').eq(1).contains('at')
        cy.get('.bk-pill').eq(2).contains('fr')
      })

    assertOptionValue('countries', '["de","at","fr"]')

    cy.get('.bk-blokkli-item-options-item')
      .eq(2)
      .find('button')
      .click({ force: true })
    cy.get('.bk-blokkli-item-options-checkboxes-dropdown').should('not.exist')
  })
})
