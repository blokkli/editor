/**
 * Hydration benchmark: loads server-rendered Nuxt pages in Chromium and
 * measures what hydration costs on the main thread. See README.md.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { chromium, type BrowserContext } from 'playwright-core'
import {
  compareSamples,
  summarize,
  totalBlockingTime,
  type LongTask,
} from './stats.ts'

type Variant = { label: string; url: string; initScript?: string }

type Run = {
  variant: string
  cpu: number
  round: number
  hydratedMs: number
  blockingUntilHydratedMs: number
  tbtMs: number
  longestTaskMs: number
  components: number
  htmlBytes: number
  payloadBytes: number
  jsBytes: number
}

const METRICS = [
  { key: 'tbtMs', label: 'Total blocking time', unit: 'ms' },
  {
    key: 'blockingUntilHydratedMs',
    label: 'Blocking until hydrated',
    unit: 'ms',
  },
  { key: 'longestTaskMs', label: 'Longest task', unit: 'ms' },
  { key: 'hydratedMs', label: 'Hydrated at', unit: 'ms' },
  { key: 'components', label: 'Hydrated components', unit: '' },
  { key: 'payloadBytes', label: 'Payload', unit: 'KB' },
  { key: 'jsBytes', label: 'JS transferred', unit: 'KB' },
] as const

const QUIET_MS = 3000
const MAX_WAIT_MS = 30000

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', multiple: true },
    init: { type: 'string', multiple: true },
    runs: { type: 'string', default: '15' },
    warmup: { type: 'string', default: '2' },
    cpu: { type: 'string', multiple: true },
    'third-party': { type: 'boolean', default: false },
    header: { type: 'string', multiple: true },
    out: { type: 'string' },
    from: { type: 'string' },
  },
})

type Recorded = {
  options: { runs: number; warmup: number; cpuRates: number[] }
  variants: Variant[]
  results: Run[]
}
const recorded: Recorded | undefined = args.from
  ? JSON.parse(readFileSync(args.from, 'utf8'))
  : undefined

function parseLabelled(value: string, index: number): [string, string] {
  const match = value.match(/^([\w-]+)=(.+)$/)
  return match ? [match[1]!, match[2]!] : [`variant-${index + 1}`, value]
}

const initScripts = Object.fromEntries(
  (args.init ?? []).map((value, i) => {
    const [label, file] = parseLabelled(value, i)
    return [label, readFileSync(file, 'utf8')]
  }),
)
const variants: Variant[] =
  recorded?.variants ??
  (args.url ?? []).map((value, i) => {
    const [label, url] = parseLabelled(value, i)
    return { label, url, initScript: initScripts[label] }
  })
if (!variants.length) {
  console.error(
    'Usage: node test/bench-hydration/run.ts --url [label=]URL [--url ...] [--init label=script.js] [--header "Name: value"] [--runs 15] [--warmup 2] [--cpu 4 --cpu 1] [--third-party] [--out file.json]\n       node test/bench-hydration/run.ts --from file.json',
  )
  process.exit(1)
}
const extraHTTPHeaders = Object.fromEntries(
  (args.header ?? []).map((header) => {
    const separator = header.indexOf(':')
    return [
      header.slice(0, separator).trim(),
      header.slice(separator + 1).trim(),
    ]
  }),
)
const runs = recorded?.options.runs ?? Number(args.runs)
const warmup = recorded?.options.warmup ?? Number(args.warmup)
const cpuRates =
  recorded?.options.cpuRates ?? (args.cpu ?? ['4', '1']).map(Number)

// Runs in the page before any of its scripts.
function instrument() {
  const w = window as any
  w.__bench = { longTasks: [], hydratedAt: null, components: 0 }
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      w.__bench.longTasks.push({
        start: entry.startTime,
        duration: entry.duration,
      })
    }
  }).observe({ type: 'longtask', buffered: true })

  function countComponents(vnode: any): number {
    if (!vnode || typeof vnode !== 'object') {
      return 0
    }
    let count = 0
    if (vnode.component) {
      count += 1 + countComponents(vnode.component.subTree)
    }
    if (vnode.suspense) {
      count += countComponents(vnode.suspense.activeBranch)
    }
    if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        count += countComponents(child)
      }
    }
    return count
  }

  // Vue sets __vue_app__ on the root element right after app.mount() has
  // hydrated the synchronous part of the tree. Hydration is only done when
  // Nuxt's root Suspense resolves: async components (blökkli loads most blocks
  // as async components) and async setup hydrate after the mount.
  Object.defineProperty(Element.prototype, '__vue_app__', {
    configurable: true,
    set(this: any, app: any) {
      Object.defineProperty(this, '__vue_app__', {
        value: app,
        writable: true,
        configurable: true,
      })
      const nuxtApp = app.config.globalProperties.$nuxt
      const done = () => {
        w.__bench.hydratedAt = performance.now()
        // app._instance only exists in dev builds; the container keeps the
        // root vnode in every build.
        w.__bench.components = countComponents(this._vnode)
      }
      if (nuxtApp?.isHydrating) {
        nuxtApp.hooks.hookOnce('app:suspense:resolve', done)
      } else {
        done()
      }
    },
  })
}

async function measure(
  context: BrowserContext,
  variant: Variant,
  cpu: number,
): Promise<Omit<Run, 'variant' | 'cpu' | 'round'>> {
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })

  const host = new URL(variant.url).host
  if (!args['third-party']) {
    await page.route('**/*', (route) => {
      const request = route.request()
      const isThirdPartyCode =
        new URL(request.url()).host !== host &&
        ['script', 'xhr', 'fetch', 'document'].includes(request.resourceType())
      return isThirdPartyCode ? route.abort() : route.continue()
    })
  }

  const scriptRequests = new Set<string>()
  let jsBytes = 0
  cdp.on('Network.responseReceived', (event) => {
    if (event.type === 'Script') {
      scriptRequests.add(event.requestId)
    }
  })
  cdp.on('Network.loadingFinished', (event) => {
    if (scriptRequests.has(event.requestId)) {
      jsBytes += event.encodedDataLength
    }
  })

  await page.addInitScript(instrument)
  if (variant.initScript) {
    await page.addInitScript(variant.initScript)
  }

  const response = await page.goto(variant.url, { waitUntil: 'load' })
  const html = (await response?.text()) ?? ''

  const started = Date.now()
  let bench: {
    longTasks: LongTask[]
    hydratedAt: number | null
    components: number
  }
  for (;;) {
    bench = await page.evaluate(() => (window as any).__bench)
    const now: number = await page.evaluate(() => performance.now())
    const lastTaskEnd = Math.max(
      0,
      ...bench.longTasks.map((task) => task.start + task.duration),
    )
    if (bench.hydratedAt !== null && now - lastTaskEnd > QUIET_MS) {
      break
    }
    if (Date.now() - started > MAX_WAIT_MS) {
      throw new Error(`${variant.label}: no hydration within ${MAX_WAIT_MS} ms`)
    }
    await page.waitForTimeout(250)
  }

  const payload = html.match(
    /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )

  await page.close()
  return {
    hydratedMs: bench.hydratedAt!,
    blockingUntilHydratedMs: totalBlockingTime(bench.longTasks, {
      until: bench.hydratedAt!,
    }),
    tbtMs: totalBlockingTime(bench.longTasks),
    longestTaskMs: Math.max(0, ...bench.longTasks.map((task) => task.duration)),
    components: bench.components,
    htmlBytes: html.length,
    payloadBytes: payload?.[1]?.length ?? 0,
    jsBytes,
  }
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

function format(value: number, unit: string): string {
  if (unit === 'KB') {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${Math.round(value)}${unit ? ' ' + unit : ''}`
}

function formatChange(baseline: number[], candidate: number[]): string {
  const c = compareSamples(baseline, candidate)
  const sign = c.relative > 0 ? '+' : ''
  return `${sign}${(c.relative * 100).toFixed(0)} %${c.significant ? '' : ' (n.s.)'}`
}

function table(header: string[], rows: string[][]): string[] {
  return [header, header.map(() => '---'), ...rows].map(
    (row) => `| ${row.join(' | ')} |`,
  )
}

function report(results: Run[]): string {
  const lines: string[] = []
  const [baseline, ...candidates] = variants
  for (const cpu of cpuRates) {
    const sample = (variant: Variant, key: (typeof METRICS)[number]['key']) =>
      results
        .filter((r) => r.variant === variant.label && r.cpu === cpu)
        .map((r) => r[key])

    lines.push(`\n### CPU ${cpu}x slowdown\n`)
    lines.push(
      ...table(
        ['Metric', ...variants.map((v) => v.label)],
        METRICS.map((metric) => [
          metric.label,
          ...variants.map((variant) => {
            const s = summarize(sample(variant, metric.key))
            const cell = `${format(s.median, metric.unit)} (${format(s.p25, metric.unit)}–${format(s.p75, metric.unit)})`
            return variant === baseline
              ? cell
              : `${cell} **${formatChange(sample(baseline!, metric.key), sample(variant, metric.key))}**`
          }),
        ]),
      ),
    )

    // Two candidates that both beat the baseline can still be tied with each
    // other; the table above can't show that.
    const pairs = candidates.flatMap((a, i) =>
      candidates.slice(i + 1).map((b) => [a, b] as const),
    )
    if (pairs.length) {
      lines.push(`\nCandidates against each other (second against first):\n`)
      lines.push(
        ...table(
          ['Metric', ...pairs.map(([a, b]) => `${b.label} vs ${a.label}`)],
          METRICS.map((metric) => [
            metric.label,
            ...pairs.map(([a, b]) =>
              formatChange(sample(a, metric.key), sample(b, metric.key)),
            ),
          ]),
        ),
      )
    }
  }
  return lines.join('\n')
}

function environment() {
  let gitSha = ''
  try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    // Outside a git checkout the samples are still valid, just unattributed.
  }
  return {
    date: new Date().toISOString(),
    cpu: os.cpus()[0]?.model,
    cores: os.cpus().length,
    node: process.version,
    gitSha,
  }
}

async function measureAll(): Promise<Run[]> {
  const browser = await chromium.launch()
  const results: Run[] = []
  const total = (warmup + runs) * cpuRates.length * variants.length
  let done = 0
  for (let round = 0; round < warmup + runs; round++) {
    for (const cpu of cpuRates) {
      // Alternating the order spreads drift (thermal throttling, background
      // load) evenly over the variants instead of penalising the last one.
      for (const variant of shuffled(variants)) {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          viewport: { width: 1440, height: 900 },
          extraHTTPHeaders,
        })
        const run = await measure(context, variant, cpu)
        await context.close()
        done++
        process.stderr.write(`\r${done}/${total} runs`)
        if (round >= warmup) {
          results.push({ variant: variant.label, cpu, round, ...run })
        }
      }
    }
  }
  await browser.close()
  process.stderr.write('\n')
  return results
}

function save(results: Run[]): string {
  const out =
    args.out ??
    path.join(
      'tmp',
      'bench-hydration',
      `${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    )
  mkdirSync(path.dirname(out), { recursive: true })
  writeFileSync(
    out,
    JSON.stringify(
      {
        environment: environment(),
        options: { runs, warmup, cpuRates, thirdParty: args['third-party'] },
        variants: variants.map(({ label, url }) => ({ label, url })),
        results,
      },
      null,
      2,
    ),
  )
  return out
}

const results = recorded?.results ?? (await measureAll())
console.log(
  `## Hydration benchmark\n\n${runs} runs per cell (after ${warmup} warmup), median (p25–p75). Changes are against **${variants[0]!.label}**; (n.s.) = the 95 % bootstrap interval includes 0.\n${report(results)}`,
)
if (!recorded) {
  console.log(`\nRaw samples: ${save(results)}`)
}
