const mouse = (x: number, y: number) => {
  return {
    button: 0,
    x,
    y,
    mouseX: x,
    mouseY: y,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    force: true,
  }
}

describe('The MultiSelect feature', () => {
  it('allows selecting multiple blocks using a rectangle', () => {
    cy.bkOpen()
      .bkAddNewBlock('text')
      .bkCloseEditableFieldForm()
      .bkAddNewBlock('title')
      .bkCloseEditableFieldForm()
      .wait(1000)

    cy.get('body')
      .trigger('mousedown', mouse(70, 70))
      .wait(100)
      .trigger('mousemove', mouse(80, 80))
      .wait(100)
      .trigger('mousemove', mouse(1400, 1200))
      .wait(100)
      .trigger('mouseup', mouse(1400, 1200))

    cy.get('.bk-selection .bk-selectable')
      .should('have.lengthOf', 2)
      .shouldBeVisible()
  })
})
