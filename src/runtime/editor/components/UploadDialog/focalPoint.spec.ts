import { describe, expect, test } from 'vitest'
import {
  formatFocalPoint,
  moveFocalPoint,
  parseFocalPoint,
  toPercent,
} from './focalPoint'

describe('toPercent', () => {
  test('rounds a share to a whole percent', () => {
    expect(toPercent(0.254)).toBe(25)
    expect(toPercent(0.255)).toBe(26)
  })

  test('stays within the image', () => {
    expect(toPercent(-0.2)).toBe(0)
    expect(toPercent(1.3)).toBe(100)
  })
})

describe('parseFocalPoint', () => {
  test('reads "x,y"', () => {
    expect(parseFocalPoint('25,75')).toEqual({ x: 25, y: 75 })
    expect(parseFocalPoint(' 0 , 100 ')).toEqual({ x: 0, y: 100 })
  })

  test('rounds decimals and keeps the point within the image', () => {
    expect(parseFocalPoint('25.6,150')).toEqual({ x: 26, y: 100 })
  })

  test('is the centre for anything else', () => {
    expect(parseFocalPoint('')).toEqual({ x: 50, y: 50 })
    expect(parseFocalPoint('25')).toEqual({ x: 50, y: 50 })
    expect(parseFocalPoint('-5,20')).toEqual({ x: 50, y: 50 })
    expect(parseFocalPoint(undefined)).toEqual({ x: 50, y: 50 })
  })
})

describe('formatFocalPoint', () => {
  test('writes "x,y"', () => {
    expect(formatFocalPoint({ x: 25, y: 75 })).toBe('25,75')
  })
})

describe('moveFocalPoint', () => {
  const point = { x: 50, y: 95 }

  test('moves by a percent per arrow key', () => {
    expect(moveFocalPoint(point, 'ArrowLeft', false)).toEqual({ x: 49, y: 95 })
    expect(moveFocalPoint(point, 'ArrowRight', false)).toEqual({
      x: 51,
      y: 95,
    })
    expect(moveFocalPoint(point, 'ArrowUp', false)).toEqual({ x: 50, y: 94 })
    expect(moveFocalPoint(point, 'ArrowDown', false)).toEqual({ x: 50, y: 96 })
  })

  test('moves by ten with Shift, within the image', () => {
    expect(moveFocalPoint(point, 'ArrowLeft', true)).toEqual({ x: 40, y: 95 })
    expect(moveFocalPoint(point, 'ArrowDown', true)).toEqual({ x: 50, y: 100 })
  })

  test("doesn't move by other keys", () => {
    expect(moveFocalPoint(point, 'Enter', false)).toBeNull()
  })
})
