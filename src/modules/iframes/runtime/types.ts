/**
 * A map of container widths (as strings) to iframe heights in pixels.
 *
 * The keys correspond to `@container` query breakpoints. For example,
 * `{ "375": 400, "768": 600, "1440": 800 }` means:
 * - At container width ≤ 375px, the iframe is 400px tall
 * - At container width ≤ 768px, the iframe is 600px tall
 * - At container width > 768px (default), the iframe is 800px tall
 */
export type IframeHeightMap = Record<string, number>
