import { describe, expect, test } from 'vitest'
import type { ChildrenFlow } from '#blokkli/editor/helpers/dropTargets'
import type { Rectangle } from '#blokkli/editor/types/geometry'
import {
  BAR_BAND,
  MAX_SHAPES,
  TAB_DEPTH,
  TAB_LENGTH,
  buildFrame,
  getBeforeAfterSides,
  getEndBar,
  getFade,
  getFieldEndSide,
  getFlowSides,
  getInsertionLineDistance,
  getInsertionLineRect,
  getNeighbourSide,
  getRevealedFields,
  getTabOffset,
  getTabRect,
  hitTest,
  placeLabel,
  type FieldInput,
  type FrameInput,
  type HitZone,
} from './geometry'

function rect(x: number, y: number, width: number, height: number): Rectangle {
  return { x, y, width, height }
}

function flow(values: Partial<ChildrenFlow> = {}): ChildrenFlow {
  return { orientation: 'vertical', rtl: false, reversed: false, ...values }
}

const vertical = flow()
const horizontal = flow({ orientation: 'horizontal' })
const viewport = rect(0, 0, 2000, 2000)

describe('getFade', () => {
  test('is fully visible from a scale of 0.5', () => {
    expect(getFade(2)).toBe(1)
    expect(getFade(0.5)).toBe(1)
  })

  test('fades out between 0.5 and 0.4', () => {
    expect(getFade(0.45)).toBeCloseTo(0.5)
    expect(getFade(0.4)).toBe(0)
    expect(getFade(0.2)).toBe(0)
  })
})

describe('getFlowSides', () => {
  test('vertical fields add above and below', () => {
    expect(getFlowSides(vertical)).toEqual({ before: 'top', after: 'bottom' })
    expect(getFlowSides(flow({ reversed: true }))).toEqual({
      before: 'bottom',
      after: 'top',
    })
  })

  test('horizontal fields add left and right, mirrored right to left', () => {
    expect(getFlowSides(horizontal)).toEqual({ before: 'left', after: 'right' })
    expect(
      getFlowSides(flow({ orientation: 'horizontal', rtl: true })),
    ).toEqual({ before: 'right', after: 'left' })
    expect(
      getFlowSides(flow({ orientation: 'horizontal', reversed: true })),
    ).toEqual({ before: 'right', after: 'left' })
    expect(
      getFlowSides(
        flow({ orientation: 'horizontal', rtl: true, reversed: true }),
      ),
    ).toEqual({ before: 'left', after: 'right' })
  })
})

describe('getNeighbourSide', () => {
  const block = rect(300, 100, 200, 100)

  test('finds neighbours above and below, also when they touch', () => {
    expect(getNeighbourSide(block, rect(300, 0, 200, 100))).toBe('top')
    expect(getNeighbourSide(block, rect(300, 200, 200, 40))).toBe('bottom')
  })

  test('finds neighbours in the same row', () => {
    expect(getNeighbourSide(block, rect(0, 100, 300, 100))).toBe('left')
    expect(getNeighbourSide(block, rect(520, 110, 100, 80))).toBe('right')
  })

  test('finds nothing for a diagonal neighbour or an overlapping one', () => {
    // The next item of a grid that wrapped to the next row.
    expect(getNeighbourSide(block, rect(0, 220, 200, 100))).toBeNull()
    expect(getNeighbourSide(block, rect(350, 120, 200, 100))).toBeNull()
  })
})

describe('getBeforeAfterSides', () => {
  const block = rect(300, 100, 200, 100)

  test('uses the neighbours in a vertical field', () => {
    expect(
      getBeforeAfterSides(
        block,
        rect(300, 0, 200, 100),
        rect(300, 200, 200, 100),
        vertical,
      ),
    ).toEqual({ before: 'top', after: 'bottom' })
  })

  test('follows the real positions in reversed or reordered layouts', () => {
    // column-reverse: the previous block is below.
    expect(
      getBeforeAfterSides(
        block,
        rect(300, 200, 200, 100),
        rect(300, 0, 200, 100),
        vertical,
      ),
    ).toEqual({ before: 'bottom', after: 'top' })

    // Right to left, or CSS order, while the flow says left to right.
    expect(
      getBeforeAfterSides(
        block,
        rect(500, 100, 200, 100),
        rect(100, 100, 200, 100),
        horizontal,
      ),
    ).toEqual({ before: 'right', after: 'left' })
  })

  test('derives the missing side from the neighbour that exists', () => {
    expect(
      getBeforeAfterSides(block, rect(100, 100, 200, 100), null, vertical),
    ).toEqual({ before: 'left', after: 'right' })
    expect(
      getBeforeAfterSides(block, null, rect(300, 200, 200, 100), horizontal),
    ).toEqual({ before: 'top', after: 'bottom' })
  })

  test('ignores a neighbour that wrapped to the next row', () => {
    expect(
      getBeforeAfterSides(
        block,
        rect(100, 100, 200, 100),
        rect(0, 220, 200, 100),
        horizontal,
      ),
    ).toEqual({ before: 'left', after: 'right' })
  })

  test('falls back to the flow without neighbours', () => {
    expect(getBeforeAfterSides(block, null, null, vertical)).toEqual({
      before: 'top',
      after: 'bottom',
    })
    expect(
      getBeforeAfterSides(
        block,
        null,
        null,
        flow({ orientation: 'horizontal', rtl: true }),
      ),
    ).toEqual({ before: 'right', after: 'left' })
  })

  test('never puts before and after on the same side', () => {
    expect(
      getBeforeAfterSides(
        block,
        rect(300, 200, 200, 100),
        rect(300, 300, 200, 100),
        vertical,
      ),
    ).toEqual({ before: 'bottom', after: 'top' })
  })
})

describe('getFieldEndSide', () => {
  test('falls back to the flow with a single block', () => {
    const last = rect(0, 0, 100, 50)
    expect(getFieldEndSide(last, null, vertical)).toBe('bottom')
    expect(getFieldEndSide(last, null, horizontal)).toBe('right')
    expect(
      getFieldEndSide(
        last,
        null,
        flow({ orientation: 'horizontal', rtl: true }),
      ),
    ).toBe('left')
    expect(getFieldEndSide(last, null, flow({ reversed: true }))).toBe('top')
  })

  test('points away from the block before the last one', () => {
    expect(
      getFieldEndSide(rect(0, 50, 100, 50), rect(0, 0, 100, 50), vertical),
    ).toBe('bottom')
    expect(
      getFieldEndSide(rect(0, 0, 100, 50), rect(0, 50, 100, 50), vertical),
    ).toBe('top')
    expect(
      getFieldEndSide(rect(100, 0, 100, 50), rect(0, 0, 100, 50), horizontal),
    ).toBe('right')
    expect(
      getFieldEndSide(rect(0, 0, 100, 50), rect(100, 0, 100, 50), horizontal),
    ).toBe('left')
  })

  test('falls back to the flow when the last block wrapped to a new row', () => {
    expect(
      getFieldEndSide(rect(0, 60, 100, 50), rect(200, 0, 100, 50), horizontal),
    ).toBe('right')
  })
})

describe('getTabRect', () => {
  const block = rect(100, 100, 200, 100)

  test('has a constant size at any scale', () => {
    for (const scale of [0.5, 1, 2]) {
      const top = getTabRect(block, 'top', scale, 1, viewport)
      expect([top.width, top.height]).toEqual([TAB_LENGTH, TAB_DEPTH])
      const left = getTabRect(block, 'left', scale, 1, viewport)
      expect([left.width, left.height]).toEqual([TAB_DEPTH, TAB_LENGTH])
    }
  })

  test('sits outside the selection outline, centred on the edge', () => {
    const offset = getTabOffset(1)
    expect(getTabRect(block, 'top', 1, 1, viewport)).toEqual(
      rect(
        200 - TAB_LENGTH / 2,
        100 - offset - TAB_DEPTH,
        TAB_LENGTH,
        TAB_DEPTH,
      ),
    )
    expect(getTabRect(block, 'bottom', 1, 1, viewport)).toEqual(
      rect(200 - TAB_LENGTH / 2, 200 + offset, TAB_LENGTH, TAB_DEPTH),
    )
    expect(getTabRect(block, 'left', 1, 1, viewport)).toEqual(
      rect(
        100 - offset - TAB_DEPTH,
        150 - TAB_LENGTH / 2,
        TAB_DEPTH,
        TAB_LENGTH,
      ),
    )
    expect(getTabRect(block, 'right', 1, 1, viewport)).toEqual(
      rect(300 + offset, 150 - TAB_LENGTH / 2, TAB_DEPTH, TAB_LENGTH),
    )
  })

  test('is on whole pixels', () => {
    const tab = getTabRect(
      rect(100.3, 100.6, 200, 100),
      'bottom',
      0.8,
      1,
      viewport,
    )
    expect(Number.isInteger(tab.x)).toBe(true)
    expect(Number.isInteger(tab.y)).toBe(true)
  })

  test('stays on the visible part of a long edge', () => {
    const wide = rect(0, 100, 2000, 100)
    const tab = getTabRect(wide, 'top', 1, 1, rect(1000, 0, 500, 500))
    expect(tab.x + tab.width / 2).toBe(1250)
  })

  test('scales from the middle of its flat side', () => {
    const full = getTabRect(block, 'bottom', 1, 1, viewport)
    const half = getTabRect(block, 'bottom', 1, 0.5, viewport)
    expect([half.width, half.height]).toEqual([TAB_LENGTH / 2, TAB_DEPTH / 2])
    expect(half.y).toBe(full.y)
    // Within the half pixel of rounding to whole pixels.
    expect(
      Math.abs(half.x + half.width / 2 - (full.x + full.width / 2)),
    ).toBeLessThanOrEqual(0.5)
  })
})

describe('getInsertionLineRect', () => {
  const block = rect(0, 100, 200, 50)

  test('sits past the tab, at the same distance on every side', () => {
    const distance = getInsertionLineDistance(1)
    const tab = getTabRect(block, 'bottom', 1, 1, viewport)
    const bottom = getInsertionLineRect(block, 'bottom', 1)
    expect(bottom.y + bottom.height / 2).toBe(150 + distance)
    // It touches neither the tab nor the selection outline.
    expect(bottom.y + bottom.height / 2).toBeGreaterThan(tab.y + tab.height)
    const top = getInsertionLineRect(block, 'top', 1)
    expect(top.y + top.height / 2).toBe(100 - distance)
  })

  test('spans the edge, with the dots at its ends', () => {
    const line = getInsertionLineRect(block, 'bottom', 1)
    expect(line.x).toBeLessThan(block.x)
    expect(line.width).toBeGreaterThan(block.width)
  })

  test('runs vertically for left and right', () => {
    const side = rect(300, 0, 200, 100)
    const left = getInsertionLineRect(side, 'left', 1)
    expect(left.x + left.width / 2).toBe(300 - getInsertionLineDistance(1))
    expect(left.height).toBeGreaterThan(side.height)
    const right = getInsertionLineRect(side, 'right', 1)
    expect(right.x + right.width / 2).toBe(500 + getInsertionLineDistance(1))
  })
})

describe('getEndBar', () => {
  const field = rect(0, 0, 300, 200)

  test('runs along the inside of the end edge', () => {
    const end = getEndBar(field, 'bottom', rect(0, 150, 300, 50), 1, viewport)
    expect(end.bar).toEqual(rect(0, 196, 300, 4))
    expect(end.band).toEqual(rect(0, 200 - BAR_BAND, 300, BAR_BAND))
    expect(end.knob).toEqual({ x: 150, y: 200 - end.radius })
    expect(end.radius).toBe(11)
  })

  test('works on every side', () => {
    const wide = rect(0, 0, 600, 100)
    expect(getEndBar(wide, 'right', null, 1, viewport).bar).toEqual(
      rect(596, 0, 4, 100),
    )
    expect(getEndBar(wide, 'left', null, 1, viewport).knob).toEqual({
      x: 11,
      y: 50,
    })
    expect(getEndBar(wide, 'top', null, 1, viewport).knob).toEqual({
      x: 300,
      y: 11,
    })
  })

  test('reaches at most 40% into a small last block', () => {
    const end = getEndBar(field, 'bottom', rect(0, 176, 300, 24), 1, viewport)
    expect(end.band.height).toBeCloseTo(9.6)
    expect(
      getEndBar(field, 'bottom', rect(0, 188, 300, 12), 1, viewport).band
        .height,
    ).toBeCloseTo(4.8)
  })

  test('has a smaller knob in a thin field', () => {
    expect(
      getEndBar(rect(0, 0, 300, 18), 'bottom', null, 1, viewport).radius,
    ).toBe(9)
    expect(
      getEndBar(rect(0, 0, 300, 10), 'bottom', null, 1, viewport).radius,
    ).toBe(8)
  })
})

describe('getRevealedFields', () => {
  const outer: FieldInput = {
    id: 'field:outer',
    rect: rect(0, 0, 400, 400),
    isEmpty: false,
    flow: vertical,
    last: null,
    secondLast: null,
  }
  const inner: FieldInput = {
    ...outer,
    id: 'field:inner',
    rect: rect(50, 50, 100, 100),
  }
  const empty: FieldInput = { ...outer, id: 'field:empty', isEmpty: true }

  test('reveals the smallest filled field under the pointer', () => {
    const result = getRevealedFields(
      [outer, inner, empty],
      { x: 100, y: 100 },
      false,
      null,
    )
    expect([...result.ids]).toEqual(['field:inner'])
    expect(result.underPointer).toBe('field:inner')
  })

  test('reveals all filled fields on touch', () => {
    const result = getRevealedFields([outer, inner, empty], null, true, null)
    expect([...result.ids].sort()).toEqual(['field:inner', 'field:outer'])
    expect(result.underPointer).toBeNull()
  })

  test('keeps the field of the open bundle selector revealed', () => {
    const result = getRevealedFields([outer, inner], null, false, 'field:outer')
    expect([...result.ids]).toEqual(['field:outer'])
  })
})

describe('hitTest', () => {
  const tab: HitZone = {
    targetId: 'after',
    kind: 'tab',
    rect: rect(0, 0, 32, 16),
  }
  const knob: HitZone = {
    targetId: 'field:a',
    kind: 'knob',
    rect: rect(0, 0, 22, 22),
    radius: 11,
  }
  const area: HitZone = {
    targetId: 'field:b',
    kind: 'area',
    rect: rect(0, 0, 300, 300),
  }

  test('prefers tabs, then knobs, then bars, then areas', () => {
    expect(hitTest([area, knob, tab], { x: 10, y: 10 })?.targetId).toBe('after')
    expect(hitTest([area, knob], { x: 10, y: 10 })?.targetId).toBe('field:a')
    expect(hitTest([area], { x: 200, y: 200 })?.targetId).toBe('field:b')
  })

  test('hits knobs by their round shape', () => {
    expect(hitTest([knob], { x: 1, y: 1 })).toBeNull()
    expect(hitTest([knob], { x: 11, y: 1 })?.targetId).toBe('field:a')
  })

  test('picks the nearest zone of the same kind', () => {
    const before: HitZone = {
      ...tab,
      targetId: 'before',
      rect: rect(20, 0, 32, 16),
    }
    expect(hitTest([tab, before], { x: 30, y: 8 })?.targetId).toBe('before')
  })

  test('counts the slop around a zone', () => {
    expect(hitTest([tab], { x: 34, y: 8 })).toBeNull()
    expect(hitTest([tab], { x: 34, y: 8 }, 2)?.targetId).toBe('after')
  })
})

describe('placeLabel', () => {
  const bounds = rect(0, 0, 500, 500)
  const size = { width: 100, height: 30 }

  test('goes on the requested side, centred on the anchor', () => {
    expect(placeLabel({ x: 250, y: 100 }, size, 'bottom', 10, bounds)).toEqual({
      x: 200,
      y: 110,
    })
  })

  test('flips to the opposite side when there is no room', () => {
    expect(placeLabel({ x: 250, y: 480 }, size, 'bottom', 10, bounds)).toEqual({
      x: 200,
      y: 440,
    })
  })

  test('stays within the bounds', () => {
    expect(placeLabel({ x: 10, y: 100 }, size, 'bottom', 10, bounds).x).toBe(0)
  })
})

describe('buildFrame', () => {
  const block = rect(100, 100, 600, 400)
  const emptyField: FieldInput = {
    id: 'field:empty',
    rect: rect(100, 100, 300, 48),
    isEmpty: true,
    flow: vertical,
    last: null,
    secondLast: null,
  }
  const filledField: FieldInput = {
    id: 'field:filled',
    rect: rect(400, 100, 300, 400),
    isEmpty: false,
    flow: vertical,
    last: rect(400, 400, 300, 100),
    secondLast: rect(400, 100, 300, 300),
  }
  const base: FrameInput = {
    scale: 1,
    transition: 1,
    pointer: null,
    isTouch: false,
    viewport,
    activeId: null,
    siblings: { block, prev: null, next: null, flow: vertical },
    fields: [emptyField, filledField],
  }
  const types = (input: FrameInput) =>
    buildFrame(input).shapes.map((s) => s.type)

  test('has no tabs when the host is selected', () => {
    expect(types({ ...base, siblings: null })).toEqual(['knob', 'area'])
  })

  test('always draws empty fields, filled fields only under the pointer', () => {
    expect(types(base)).toEqual(['tab', 'tab', 'knob', 'area'])
    expect(types({ ...base, pointer: { x: 550, y: 250 } })).toEqual([
      'tab',
      'tab',
      'knob',
      'knob',
      'bar',
      'outline',
      'area',
    ])
  })

  test('reveals all filled fields on touch, without tooltip or tag', () => {
    const frame = buildFrame({
      ...base,
      isTouch: true,
      pointer: { x: 550, y: 250 },
    })
    expect(frame.shapes.filter((s) => s.type === 'bar')).toHaveLength(1)
    expect(frame.tooltip).toBeNull()
    expect(frame.tag).toBeNull()
    expect(frame.hoveredId).toBeNull()
  })

  test('orders tabs, insertion line, knobs, bars, outline and areas', () => {
    const frame = buildFrame({
      ...base,
      activeId: 'after',
      pointer: { x: 550, y: 250 },
    })
    expect(frame.shapes.map((s) => s.type)).toEqual([
      'tab',
      'tab',
      'line',
      'knob',
      'knob',
      'bar',
      'outline',
      'area',
    ])
    // The hovered tab comes first.
    expect(frame.shapes[0]).toMatchObject({ targetId: 'after', hovered: true })
  })

  test('treats the target of the open selector as hovered, without tooltip', () => {
    const frame = buildFrame({ ...base, activeId: 'field:filled' })
    expect(frame.hoveredId).toBe('field:filled')
    expect(frame.shapes.find((s) => s.type === 'bar')?.hovered).toBe(true)
    expect(frame.tooltip).toBeNull()
  })

  test('shows the tooltip of the hovered tab towards the inside', () => {
    const first = buildFrame(base)
    const after = first.zones.find((zone) => zone.targetId === 'after')!
    const frame = buildFrame({
      ...base,
      pointer: {
        x: after.rect.x + after.rect.width / 2,
        y: after.rect.y + after.rect.height / 2,
      },
    })
    expect(frame.hoveredId).toBe('after')
    expect(frame.pointerId).toBe('after')
    expect(frame.tooltip).toMatchObject({ targetId: 'after', side: 'top' })
    expect(frame.shapes.some((s) => s.type === 'line')).toBe(true)
  })

  test('draws nothing when zoomed out to 0.4 or during the scale-in start', () => {
    expect(buildFrame({ ...base, scale: 0.4 }).shapes).toEqual([])
    expect(buildFrame({ ...base, scale: 0.4 }).zones).toEqual([])
    expect(buildFrame({ ...base, transition: 0 }).shapes).toEqual([])
  })

  test(`draws at most ${MAX_SHAPES} shapes`, () => {
    const fields = Array.from({ length: 30 }, (_, i) => ({
      ...emptyField,
      id: `field:${i}` as const,
      rect: rect(0, i * 50, 300, 48),
    }))
    expect(buildFrame({ ...base, siblings: null, fields }).shapes).toHaveLength(
      MAX_SHAPES,
    )
  })

  test('skips shapes outside the viewport', () => {
    expect(
      types({
        ...base,
        siblings: null,
        fields: [{ ...emptyField, rect: rect(5000, 5000, 300, 48) }],
      }),
    ).toEqual([])
  })

  test('tags the field under the pointer at its start corner', () => {
    expect(buildFrame({ ...base, pointer: { x: 550, y: 250 } }).tag).toEqual({
      targetId: 'field:filled',
      anchor: { x: 404, y: 104 },
      alignEnd: false,
    })
    const rtl = buildFrame({
      ...base,
      pointer: { x: 550, y: 250 },
      fields: [{ ...filledField, flow: flow({ rtl: true }) }],
    })
    expect(rtl.tag).toEqual({
      targetId: 'field:filled',
      anchor: { x: 696, y: 104 },
      alignEnd: true,
    })
  })
})
