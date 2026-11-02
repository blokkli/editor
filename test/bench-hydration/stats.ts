export type LongTask = { start: number; duration: number }

export type Summary = {
  n: number
  median: number
  p25: number
  p75: number
  min: number
  max: number
}

export type Comparison = {
  /** Median of the candidate minus median of the baseline. */
  diff: number
  relative: number
  /** 95 % bootstrap interval of `diff`. */
  low: number
  high: number
  significant: boolean
}

const BLOCKING_THRESHOLD_MS = 50

export function quantile(values: number[], q: number): number {
  if (!values.length) {
    throw new Error('quantile of an empty sample')
  }
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const weight = position - lower
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight
}

export function median(values: number[]): number {
  return quantile(values, 0.5)
}

export function summarize(values: number[]): Summary {
  return {
    n: values.length,
    median: median(values),
    p25: quantile(values, 0.25),
    p75: quantile(values, 0.75),
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

export function totalBlockingTime(
  tasks: LongTask[],
  window: { from?: number; until?: number } = {},
): number {
  const from = window.from ?? 0
  const until = window.until ?? Infinity
  return tasks
    .filter((task) => task.start >= from && task.start <= until)
    .reduce(
      (sum, task) => sum + Math.max(0, task.duration - BLOCKING_THRESHOLD_MS),
      0,
    )
}

// Seeded, so that a report can be reproduced from its raw samples.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function resample(values: number[], random: () => number): number[] {
  return values.map(() => values[Math.floor(random() * values.length)]!)
}

/**
 * Compares the medians of two samples. The interval comes from resampling
 * both samples, so it makes no assumption about how run times are
 * distributed (they are skewed: a run is often slow, never much faster).
 */
export function compareSamples(
  baseline: number[],
  candidate: number[],
  options: { seed?: number; iterations?: number } = {},
): Comparison {
  const random = mulberry32(options.seed ?? 1)
  const iterations = options.iterations ?? 2000
  const diffs: number[] = []
  for (let i = 0; i < iterations; i++) {
    diffs.push(
      median(resample(candidate, random)) - median(resample(baseline, random)),
    )
  }
  const diff = median(candidate) - median(baseline)
  const low = quantile(diffs, 0.025)
  const high = quantile(diffs, 0.975)
  return {
    diff,
    relative: diff / median(baseline),
    low,
    high,
    significant: low > 0 || high < 0,
  }
}
