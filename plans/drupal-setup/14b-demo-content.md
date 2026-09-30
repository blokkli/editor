# 14b: Demo content

- **Status:** in progress (2026-09-30)
- **Milestone:** M3 Hosted
- **Depends on:** 05, 13, [14a](14a-demo-concept.md)

## Goal

The content every sandbox starts with: realistic pages a visitor can relate to
and edit, not a page about blökkli. It replaces chunk 05's placeholder pages.
The topic and the content model are decided in 14a, and built in chunk 13's
sub-chunks; this chunk writes the content.

Until 2026-09-26 this was chunk 14, including the topic and the bespoke
paragraph types. Those moved to 14a, so the model is settled before chunk 13
adds types.

## Tasks

- [ ] The content from 14a's concept, in `drupal/content` (chunk 05's format,
      replacing its placeholders), with every text in EN, DE and FR so that any
      of them can be the source language (`ddev bake --source=de`):
  - [ ] about 20 pages, 6 offices, 6 news items and 10 events (14a's page list);
        the lighter ones can be trimmed
  - [x] the home page, three news items, three events and three official
        publications ([15f](15f-home-page.md), 2026-09-29)
  - [ ] the landing page "The lakeside pool" at its best, with the planted
        mistakes for the analyzer (an image without alt text, a table without a
        header row, an outdated French translation, an English paragraph left in
        the French translation for the language analyzer of 13i)
  - [x] no other text left untranslated: the language analyzer (13i) lists
        English in German and French translations, e.g. today on the office, the
        events and the 13d page (2026-09-30)
  - [ ] the library items (single blocks: containers stay out of the library
        until F12 is fixed), the service page template, and the default template
        for new columns
  - [x] one deliberately outdated French page: the paragraphs' FR translations
        flagged `content_translation_outdated` (chunk 05, 13f): the pool opening
  - [ ] the fee calculator (13i) on a page about the town's fees, in an embed
        with heights per viewport (13i's section: measure at the narrowest width
        of each range, in the longest language)
  - [ ] dates relative to the bake (chunk 05)
  - [ ] scheduled content (13e): a news item that publishes later (the lakeside
        pool's opening), and the "pool closed" banner in the site notice with an
        unpublish date, set in every language it has (F24). Events get their
        unpublish date from the hook when they're saved.
- [ ] Images and other media: openly licensed (CC0, public domain, CC BY, CC
      BY-SA; no NC or ND), without recognisable real landmarks or place names.
      Record every file's source and licence, and fill the media credit field.
- ~~The coat of arms as a media image.~~ Dropped: the frontend always renders
  the `Logo` (the user, 2026-09-29, 15c).
- [ ] Real photos and copy for what the mockups of 15a show as placeholders.
- [ ] Suggested tasks for the sandbox's welcome panel (chunk 09).

## The content (decided with the user, 2026-09-30)

German first: the user reviews the German on the site, one part at a time, and
then it's translated to French and English. The existing texts are rewritten
German-first too. While in review, new files have only `de` and the site is
baked with `ddev bake --source=de`.

**Decisions:**

1. **Three sections** in the main menu: Themen, Verwaltung, Aktuelles. Politik
   is an area under Themen; the offices are Verwaltung's children.
2. **The topics are structured like Winterthur's** (the user, 2026-09-30,
   replacing a first draft with "Leben & Wohnen"): Themen, then an area, a topic
   and its detail pages. Areas and topics are editorial pages that list what's
   below them; a topic has a contact box for the office in charge. An area can
   hold detail pages directly.
3. **A Gemeindeversammlung** (the voters' assembly), not a parliament.
4. **Events fit any season:** dates are relative to the bake, so the open-air
   cinema and the autumn market are replaced. The lakeside pool stays seasonal
   (it's the landing page).

**Writing rules:** Swiss spelling (ss, no ß), formal Sie, "Fr. 45.–", "8.00
Uhr". No current years in running text (history is fine); dates only in date
fields. Invented people, addresses and numbers (032 555 01 xx,
`@blockingen.example`); no canton by name, no real parties. Detail pages carry
about 300–600 words of real content, and generally no image (the user,
2026-09-30).

**Themen** (areas with an image, topics without; the office in brackets):

- **Lebenslagen**
  - Umzug (Einwohnerdienste): Zuzug, Wegzug, Umzug innerhalb von Blockingen
  - Ausweise und Bestätigungen
- **Steuern & Finanzen**
  - Steuern (Finanzen und Steuern): Steuererklärung, Steuern bezahlen
  - Gemeindefinanzen: Budget und Rechnung, Finanzstrategie, Blockingen in Zahlen
- **Bauen & Umwelt**
  - Abfall & Recycling (Tiefbau und Werkhof): Abfuhrtage und Abfallkalender, Was
    gehört wohin? (the library item), Entsorgungsstelle Werkhof
  - Baubewilligung (Bau und Planung): Brauche ich eine Baubewilligung?,
    Baugesuch einreichen
  - Gebühren für Wasser, Abwasser und Abfall (Gemeindewerke), with the fee
    calculator
- **Schule & Familie**
  - Schule (Schulverwaltung): Kindergarteneintritt, Deutsch, Französisch oder
    zweisprachig, Schulweg
  - Tagesschule
- **Freizeit & Kultur:** Strandbad (the landing page), Sportanlagen, Vereine,
  Geschichte
- **Soziales & Gesundheit:** Sozialhilfe, Leben im Alter
- **Politik** (Gemeindekanzlei): Gemeinderat, Gemeindeversammlung, Abstimmungen
  und Wahlen

**Verwaltung:** the nine offices are its children in the menu, and get their URL
from it like pages (`/verwaltung/einwohnerdienste`). **Aktuelles** as it is.

**Status (2026-09-30):** the tree is seeded with titles and leads (German only)
for the user to try the structure. Written in full: Strandbad, Blockingen in
Zahlen, Geschichte; then all the rest in German, for the user to review at once
(2026-09-30): every detail page, Politik, the offices, 6 news items, 8 events
(the open-air cinema and the autumn market are gone), 5 publications, the home
page, the overview pages, the config pages, three library items, the templates
and the comments. No page has English or French left (the media, the terms and
the menu keep theirs). The translation phase puts back what the German-first
rewrite removed: the outdated French of the pool opening (`outdated: [fr]`, with
hours that differ from the German) and the French site name "Bloquens". The home
page's "Today" row still has fixed texts (15f's todo), so its assembly date
doesn't match the event. The first draft's texts, in the ignored
`tmp/14b-drafts/`, are used up. The test content is gone: Verwaltung has an
introduction instead of the population chart (on Blockingen in Zahlen) and the
fee calculator (now on the fees page, without a year); Baugesuch einreichen lost
its video, old town photo and gallery (the profile poles are one image), and its
garden shed question moved to "Brauche ich eine Baubewilligung?". The home
page's call to action has no date or year. No video: there's no fictional one to
link, and editors try the video block by pasting a YouTube link (the Big Buck
Bunny media is gone).

**Translated (2026-09-30):** everything has EN and FR, and bakes with any source
language. The planted mistakes are back: the pool opening's French is outdated
(`outdated: [fr]`, 9 h to 18 h instead of 10 h to 19 h), and the lakeside pool's
kiosk text is English in French. The town is Bloquens in French, also as the
site name. Streets have French names in French (rue du Village, chemin des
Vignes), and English keeps the German ones. Themen is "Thématiques" in French:
"Thèmes" would be `/fr/themes`, which pathauto makes `/fr/themes-0` (a folder in
the docroot) and nginx sends to Drupal.

**The frontend for it:** the menu query has four levels, and an editorial page's
sub-pages list their own children (an area's topics with their detail pages)
instead of their description.

**Offices (9):** a short text on what each handles, and the fragment
`office_pages`: the detail pages it's responsible for, listed automatically (the
user, 2026-09-30, instead of a link list).

**News (6):** the pool opening, the new opening hours, the village square; new:
green waste collected weekly, a new water main in Dorfstrasse (with the road
closure), the council's budget (a chart).

**Events (8), any season:** the village square's information evening; new: the
Gemeindeversammlung, a welcome for new residents (politics), a concert of the
town band, a guided tour of the old town (culture), a floorball tournament in
the Seefeld hall (sport), a games afternoon at the toy library (family), a flea
market on the village square (market).

**Publications (5):** the three existing; new: a building application for a
solar installation, the invitation to the Gemeindeversammlung.

**Reused:** the library items "Notfallnummern", "Was gehört wohin?" and "Bleiben
Sie informiert"; "Schalteröffnungszeiten" goes (each office has its hours). The
service page template follows the service pages. The home page, footer, service
links and the "Strandbad geschlossen" banner point at the real pages.

**Images:** a second brief once the pages stand: more of the pool, old photos
for the history, the new news and events. The market and open-air cinema photos
lose their events.

**Order of review:**

1. The structure (Themen), then the detail pages area by area
2. Verwaltung and the offices
3. Politik
4. News, events and publications
5. The home page, footer, library and templates

## Acceptance criteria

- `ddev bake` builds the template from this content.
- Every page renders in all three languages.
