import { describe, expect, it } from 'vitest'
import {
  compareSamples,
  quantile,
  summarize,
  totalBlockingTime,
} from '../bench-hydration/stats'

describe('quantile', () => {
  it('interpolates between the closest ranks', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(quantile([4, 1, 3, 2], 0.25)).toBe(1.75)
    expect(quantile([7], 0.75)).toBe(7)
  })

  it('throws for an empty sample', () => {
    expect(() => quantile([], 0.5)).toThrow()
  })
})

describe('summarize', () => {
  it('returns the median, quartiles and range', () => {
    expect(summarize([5, 1, 4, 2, 3])).toEqual({
      n: 5,
      median: 3,
      p25: 2,
      p75: 4,
      min: 1,
      max: 5,
    })
  })
})

describe('totalBlockingTime', () => {
  it('sums the part of each long task above 50 ms', () => {
    const tasks = [
      { start: 100, duration: 120 },
      { start: 400, duration: 50 },
      { start: 900, duration: 300 },
    ]
    expect(totalBlockingTime(tasks)).toBe(70 + 0 + 250)
  })

  it('only counts tasks that start inside the window', () => {
    const tasks = [
      { start: 100, duration: 120 },
      { start: 900, duration: 300 },
    ]
    expect(totalBlockingTime(tasks, { until: 500 })).toBe(70)
  })
})

describe('compareSamples', () => {
  it('reports the change of the median with a bootstrap interval', () => {
    const baseline = [100, 102, 98, 101, 99, 100, 103, 97]
    const candidate = [50, 52, 48, 51, 49, 50, 53, 47]
    const result = compareSamples(baseline, candidate, { seed: 1 })

    expect(result.diff).toBe(-50)
    expect(result.relative).toBeCloseTo(-0.5)
    expect(result.low).toBeLessThan(-40)
    expect(result.high).toBeGreaterThan(-60)
    expect(result.high).toBeLessThan(0)
    expect(result.significant).toBe(true)
  })

  it('is not significant when the samples overlap', () => {
    const baseline = [100, 120, 80, 110, 90, 105, 95, 115]
    const candidate = [101, 119, 81, 111, 89, 104, 96, 114]
    expect(compareSamples(baseline, candidate, { seed: 1 }).significant).toBe(
      false,
    )
  })

  it('returns the same interval for the same seed', () => {
    const a = [10, 12, 11, 13, 9]
    const b = [8, 9, 7, 10, 8]
    expect(compareSamples(a, b, { seed: 42 })).toEqual(
      compareSamples(a, b, { seed: 42 }),
    )
  })
})
