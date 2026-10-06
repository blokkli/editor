import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

/**
 * The town's writing rules in its three languages. Through `streamTemplates`
 * they also go to the sub-agent that rewrites, writes and translates texts,
 * for every request, in place of each template's default instructions. So
 * they also say what those defaults said.
 */
export default defineBlokkliAgentSkill({
  name: 'blockingen-style-guide',
  label: {
    en: 'Style guide',
    de: 'Schreibregeln',
    fr: 'Règles de rédaction',
  },
  description:
    'The writing rules of the town of Blockingen in German, French and English: spelling, how to address the reader, amounts, times, numbers and quotation marks. Load it before you write, rewrite, check or translate texts.',
  streamTemplates: [
    'rewrite',
    'generate_content',
    'fix_readability',
    'translate',
  ],
  getContents: () => `# Style guide of Blockingen

The town's website addresses its residents. It is written in plain language, in German, French and English. The town is Blockingen in German and English, Bloquens in French.

## In every language

- Address the reader directly, and say what they need to do.
- Short sentences, one statement each. Active voice. Common words instead of jargon and officialese.
- Keep the meaning and every piece of information. Don't add facts.
- No current years in running text (history is fine): write "every year in May", not a year. Dates belong in date fields.
- HTML: paragraphs, lists, links, bold. No headings in a text (headings are title paragraphs), and keep existing HTML structure.

## German (Swiss)

- Swiss spelling: always "ss", never "ß" ("schliessen", "Strasse").
- Formal "Sie", never "du".
- Both genders in pairs: "Einwohnerinnen und Einwohner". No gender star, colon or underscore.
- Amounts: "Fr. 45.–", "Fr. 2.30"; large amounts "12,4 Millionen Franken".
- Times: "8.00 Uhr", "7.00–8.00 Uhr".
- Numbers: "45 %", "0,5"; thousands with a space: "78 000".
- Quotation marks: «Dorfplatz».

## French (Swiss)

- Swiss French: "septante", "nonante".
- Address the reader as "vous".
- Both genders in pairs: "habitantes et habitants". No inclusive dots ("habitant·e·s").
- Amounts: "Fr. 45.–", "Fr. 2.30"; large amounts "12,4 millions de francs".
- Times: "8 h 15", "18 h 30".
- Numbers: "45 %", "1,62"; thousands with a space: "78 000".
- Quotation marks with spaces inside: « Place du village ». A space before ":", ";", "?" and "!".

## English

- British spelling: "organise", "colour", "centre".
- Amounts: "CHF 45", "CHF 2.20"; large amounts "CHF 12.4 million".
- Times: "8:00", "7:00–8:00".
- Numbers: "45%", "1.62"; thousands with a comma: "2,000".
- Quotation marks: “Village square”.

## Translating

- Keep the tone and the formality of the original, and the rules above for the target language.
- Don't translate or transliterate names (people, places, streets), unless they have a common translation: the town is Bloquens in French.
`,
})
