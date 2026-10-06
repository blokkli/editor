import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

/**
 * How the demo town's pages are built: what goes where, and where the facts
 * come from. The bundles' own descriptions are in the system prompt already;
 * this is the editorial side a project knows and the agent doesn't.
 */
export default defineBlokkliAgentSkill({
  name: 'blockingen-pages',
  label: {
    en: 'Pages of Blockingen',
    de: 'Seiten von Blockingen',
    fr: 'Pages de Bloquens',
  },
  description:
    "How the pages of the town of Blockingen are built: content types, the service page's structure, headings, links, related topics, and where facts come from. Load it before you create or restructure content.",
  tools: ['get_town_data'],
  getContents: () => `# Pages of Blockingen

Blockingen (French: Bloquens) is a fictional, officially bilingual Swiss town by a lake. Its website is in German, French and English. The town is fictional, and so is everything on its site.

## Content types

- **Detail page** (page): a topic for residents, e.g. moving here, building permits, fees. A main column, a sidebar, and "Related topics" at the end. Most of them are service pages (see below).
- **Editorial page** (editorial): overviews of an area or topic, and the home page. They list what's below them.
- **News**, **events**, **official publications**: dated items, listed automatically by teaser lists.
- **Office** (office): a department of the administration with its phone, email and opening hours.

## A service page

A service page tells residents how to get something done. Start from the template "Service page" (search_templates, then add_template) and replace its placeholder texts. Its parts, in this order:

1. A text of two or three sentences: what this is about, who it applies to, and by when it needs to be done.
2. A text in an info box: whether and where it can also be done online. Leave it out if it can't.
3. A title "How to proceed", then steps: each step a short title and a text saying what to do and what is needed for it.
4. A title "Frequently asked questions", then one accordion per question: the question as its title, the answer as a text in it.

Add a table for fees or deadlines, after the steps, under its own title. Keep a page to about 300 to 600 words.

Not paragraphs: the page's lead and the office in charge are fields of the page, set in its form ("Edit" in Drupal). Don't repeat the office's contact details in a text: the sidebar shows them. If something belongs there, tell the editor.

## Rules

- **Headings are title paragraphs.** Never put headings (h2, h3…) into a text paragraph.
- **Links in a list are a link list** with one link paragraph per link, never a <ul> of links in a text. A document is a link too.
- **A single link that should stand out** is a link paragraph (a button).
- **Related topics:** up to three teasers in "Related topics" (field_related) at the end of a detail page. Only teasers go there. Find the pages with search_content.
- **Sections** (with a heading, a background and columns) are for editorial pages, news, events and offices. Detail pages don't allow them.
- **Images:** detail pages generally have none.

## Facts

- **Fees and figures of the town:** get them with get_town_data. Use its numbers exactly, never estimate or invent any.
- **Everything else** (deadlines, documents needed, who to contact): ask the editor with ask_question if you don't know it. Never invent facts, names, addresses or phone numbers.
- **Other pages of the site:** find them with search_content, and link to them instead of repeating what they say.
`,
})
