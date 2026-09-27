# 15e: Events and offices

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 15d

## Goal

Events and offices get their own design, without the sidebar. The sidebar layout
is then only for detail pages (15d). An event's date, time and place are
highlighted (the user, 2026-09-27).

## Decisions

### The user (2026-09-27)

1. **Events and offices are a chunk of their own**, with a nicer design than the
   detail page's sidebar. The event's date, time and place are important and are
   highlighted.
2. **The office gets a hero image**, like events and news (15d).

### Proposed by Claude, reviewed and confirmed by the user (2026-09-27)

3. **Key facts** instead of the sidebar: the row of the canvas's editorial
   mockup ("Wann / Wo / Eintritt").
   - A `<dl>` in the wide container, after the header: 1 column, 2 from md, 4
     from lg.
   - Each fact has a primary rule on top, a label (uppercase, muted) and its
     value.
   - The blocks follow in the content column, as on news.
4. **The event:**
   - **The header:** its category as the eyebrow, the image after the band (as
     on news), the organiser in the meta line.
   - **The registration link** is a primary button below the lead, like the
     mockup's "Zum Programm".
   - **The facts,** with the values large and in serif:
     - **One day:** date (with the weekday), time and place, then the price.
     - **Several days:** the start and the end, each with its weekday and time
       and over two columns, then place and price.
5. **The office:**
   - **Drupal:** `field_hero_image` (the storage exists; untranslatable, as on
     events), in the form and in GraphQL.
   - **The header:** "Office" as the eyebrow, the image after the band.
   - **The facts,** in body text: the address, the contact (phone and email) and
     the opening hours over two columns.
   - The opening hours' table moves out of `OfficeDetails` into its own
     component, which both use.
6. **The layout:** `Host/Layout` keeps the sidebar layout for detail pages only;
   the `asideFirst` prop goes.
7. **Out of scope:**
   - the pages an office is responsible for (a reverse reference)
   - "add to calendar", a map, "open now"

## Tasks

### Drupal

- [x] `field_hero_image` on `office`: the field, the form and view displays.
- [x] The schema loop.
- [x] Test content: hero images on the offices.

### Nuxt

- [x] `Facts` and `Facts/Item`.
- [x] `Host/Header`: an `actions` slot below the lead.
- [x] `Node/Event`: the header, the button and the facts, without the sidebar.
      The weekday in `fragment.dateRange.graphql`.
- [x] `Office/Hours`, from `OfficeDetails`.
- [x] `Node/Office`: the hero image and the facts, without the sidebar.
- [x] `Host/Layout` and `main.css`: `asideFirst` removed.
- [x] Texts in EN, DE and FR.
- [x] The design system page.

### Plans

- [x] **14a:** the office's image.
- [x] **15d:** events and offices are done.

## Acceptance criteria

- **Events and offices** have no sidebar. Their facts follow the header, at 390,
  768, 1024 and 1440 px, in EN, DE and FR.
- **An event** shows its date with the weekday, its time and place large; a
  multi-day event its range. The registration button works.
- **An office** shows its hero image, address, contact and opening hours.
- **The editor:** the hero image is droppable on offices; the blocks still work.
- `bun run verify` passes, `drush config:status` is clean.

## As built

### Drupal

- **`field_hero_image` on `office`:** made by a script in the ignored `tmp/`
  from the event's field, and exported. In the form it follows the lead.
- **Test content:** the town hall (office 2) has a hero image (media 4).
- **Texts:** `event.details` and `event.organiser` are no longer used. They're
  gone from `texts.csv` and from Drupal, with `event.registration`, which no
  longer existed in the frontend.

### Nuxt

- **`Facts` and `Facts/Item`:** a `<dl>` in `container-wide`; each item has a 3
  px primary rule on top and an uppercase label. A class on an item styles its
  value; the label keeps its own style.
- **`Node/Event`:**
  - the organiser in the meta line ("Organised by …")
  - the registration button in the header's new `actions` slot
  - the facts as a computed list, in `font-serif text-h2`
  - **The date:** `fragment.dateRange.graphql` has the weekdays (format `l`,
    translated by Drupal) and the end as `c`. The text `event.weekday_date`
    joins the weekday and the date: "@weekday, @date", in French without the
    comma.
- **`Node/Office`:** the hero image after the band; the facts are the address,
  the contact (`OfficeDetails` with `compact`: phone and email) and the opening
  hours over two columns from md.
- **`Office/Hours`:** the table from `OfficeDetails`, as wide as its content (it
  was `w-full`, which spread it over the two columns).
- **`fragment.pbMutatedEntity.graphql`:** the office's hero image. Without it, a
  changed image only showed after a reload.
- **`Host/Layout` and `main.css`:** `asideFirst` and the `order` rules are gone;
  the DOM order is the order.

## Verification (2026-09-27)

- **Gates:** `bun run verify` passes in the container (all 8 gates);
  `drush config:status` is clean.
- **Browser, logged in,** at 390, 768, 1024 and 1440 px:
  - **Events:** "Open-air cinema" (EN; one day, with a hero image and the
    registration), "Farmers' market" (EN, DE) and "Lake festival" (EN, DE; two
    days). The weekdays and dates are translated, e.g. "Dienstag, 27. Oktober
    2026, 14:00".
  - **The office:** the town hall in EN, DE and FR.
  - **The detail page** "Baubewilligungen" still has its sidebar.
  - No horizontal overflow and no console errors.
- **The editor:**
  - It loads on the office and the event; the office's `field_hero_image` is
    droppable.
  - Changing the office's image through the adapter shows at once; reverted.

## Notes

- **Not all events are translated:** the open-air cinema and the lake festival
  have no French translation, and the place of the lake festival isn't
  translated. 14b's content covers that.
