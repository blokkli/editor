import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'composition',
  label: { en: 'Building compositions', de: 'Kompositionen bauen' },
  description:
    'Load this when the user asks for a bespoke, custom-designed section (a campaign hero, a landing page section, a custom layout, an animated section) that the regular paragraph types do not offer, or when they want to change a composition.',
  tools: [
    'search_media',
    'get_composition_guide',
    'get_composition',
    'create_composition',
    'edit_composition',
    'update_composition',
  ],
  getContents: () => `
# Compositions

A composition is a paragraph that holds a bespoke section you design: markup, like a Vue single-file component's template, followed by \`<style>\` blocks. Use it when the regular paragraph types can't express what the user wants. Prefer the regular paragraph types for ordinary content.

## Workflow

1. Call **get_composition_guide** once: the components, the HTML elements, the design tokens as CSS custom properties, the breakpoints, and the rules of the CSS.
2. To add one: **create_composition** with the source and the parent field.
3. To change one: **get_composition**, then **edit_composition** to replace a snippet (the usual way), or **update_composition** to replace it all.
4. If a tool refuses the source, it lists every problem with its line: fix them all and send it again.

## The source

\`\`\`html
<script setup>
const heroImage = { width: { base: '100%', lg: '50%' }, ratio: { base: '4/3', lg: '1/1' }, priority: true }
</script>

<Box id="hero" background="primary" text-color="white" on-dark padding-x="sm" md:padding-x="lg" padding-y="lg">
  <div class="hero-row">
    <div class="copy">
      <Title id="eyebrow" as="p" class="eyebrow">Summer 2026</Title>
      <Title id="title" as="h2" class="title">Swim in the Aare this summer</Title>
      <Text id="lead" class="lead"><p>Four new bathing spots, <strong>supervised</strong> every weekend.</p></Text>
    </div>
    <Button url="/de/baden" on-dark>Find a bathing spot</Button>
    <Image id="hero-image" class="hero-image" media="42" :image-style="heroImage" />
  </div>
</Box>

<style>
.hero-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
@container (min-width: 64rem) {
  .hero-row { flex-direction: row; align-items: end; justify-content: space-between; }
  .copy, .hero-image { flex: 1; }
}
.title {
  font-size: var(--text-h2);
}
@container (min-width: 48rem) {
  .title { font-size: var(--text-h1); }
}
.eyebrow {
  font-size: var(--text-label);
  letter-spacing: var(--text-label--letter-spacing);
  text-transform: uppercase;
}
@keyframes rise { from { opacity: 0; translate: 0 2rem; } }
.title {
  animation: rise linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}
</style>
\`\`\`

- **Components** (capitalised: \`<Box>\`, \`<Button>\`, …) are the site's own parts. Their attributes take token names (\`background="primary"\`), and a prefix sets one from a breakpoint on (\`md:padding-x="lg"\`).
- **Paragraphs** (\`<Title>\`, \`<Text>\`, \`<Image>\`, …) are the site's own paragraphs, placed in your markup. Editors edit them in place, and their texts are translated. Each needs an id that stays: it's how the paragraph is found again, with its translations.
  - **Every text is in a paragraph's tag**, between its tags: a title's plain text (\`as\` sets its element: \`as="h2"\`, \`as="p"\` for an eyebrow), a text's HTML in paragraphs. Text anywhere else is refused. The tag's element gets its class: style it there.
  - \`<Image>\`: \`media\` is the ID of a media item from **search_media**. \`:image-style\` says how wide the image is shown, per breakpoint, as a share of the composition (match your CSS: the site loads the image in that size), and its ratio (the image covers that box). Leave \`media\` out when you edit a paragraph to keep its image.
- **Constants** in \`<script setup>\`: \`const name = { … }\` with literal values only, for values used more than once. Nothing runs.
- **HTML elements** (\`<section>\`, \`<div>\`, …) are the structure, yours to style. They hold paragraphs and other elements, not text.
- **Ids**: give the main parts a short, readable id (\`id="hero"\`). Parts without one get an id when saved; keep the ids you find when you edit.
- **Texts** are in the page's language. In a translation, change only the texts between the tags: the tools refuse any other change.

## Design

- **Components where the site has a standard:** a call to action is a \`<Button>\`. They keep the section consistent with the rest of the site. Your own HTML and CSS for what they don't offer: a bespoke layout, a special treatment, an animation.
- **Only tokens** for colours, spacing and type sizes: they are the site's design system. Read their descriptions and pick by purpose (a colour "used sparingly" stays an accent).
- **Mobile first:** the base styles are the phone. Change the layout with \`@container (min-width: …)\`: the composition follows its own width, not the window's.
- **Contrast:** on a dark or coloured ground, light text.
- **One clear hierarchy per section:** one heading, a short lead, then the rest.
- **Motion with care:** transitions on hover and focus, an entrance or a scroll effect where it helps the story. The section must look complete without them: they're off for visitors who prefer reduced motion.

## IMPORTANT

- Don't use add_paragraphs or set_paragraph_options for compositions: use the tools above.
- No code, \`<img>\`, forms or inline styles: the tools refuse them. Images are \`<Image>\` paragraphs.
`,
})
