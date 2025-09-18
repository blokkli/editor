
type FindResult = { string: string; element: HTMLElement };

/**
 * Finds whole-word matches of any needle under `root`, returning the closest HTMLElement
 * that contains each occurrence.
 *
 * "Word characters" are Unicode letters, numbers, marks, and underscore. Matches must be
 * bounded on both sides by start/end or a non-word character, so "foobar_test" won't match.
 */
export function findStringsWithClosestElement(root: Element, needles: string[]): FindResult[] {
  const results: FindResult[] = [];
  if (!root || needles.length === 0) return results;

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Prefer longer alternatives first to avoid partial shadowing.
  const sorted = [...needles].sort((a, b) => b.length - a.length);
  const alt = sorted.map(escape).join("|");

  // Unicode "word" class: Letters, Numbers, Marks, and Connector_Punctuation (includes "_")
  const WORD = "\\p{L}\\p{N}\\p{M}\\p{Pc}";

  // Use a non-consuming "left boundary" via (^|[^WORD]) and a right boundary via (?![WORD]).
  // We capture the actual needle in group 1.
  const re = new RegExp(`(?:^|[^${WORD}])(${alt})(?![${WORD}])`, "gu");

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

  const closestElement = (node: Node | null): HTMLElement | null => {
    let cur: Node | null = node;
    while (cur && cur.nodeType !== Node.ELEMENT_NODE) cur = cur.parentNode;
    while (cur && !(cur instanceof HTMLElement)) cur = cur.parentNode;
    return cur as HTMLElement | null;
  };

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        let p: Node | null = node.parentNode;
        while (p) {
          if (p.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has((p as Element).tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue as string;
    re.lastIndex = 0;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // m[1] is the exact needle matched as a whole word
      const matched = m[1];
      const el = closestElement(n);
      if (el && matched) results.push({ string: matched, element: el });

      // Safety against zero-length loops (not expected here, but harmless)
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }

  return results;
}
