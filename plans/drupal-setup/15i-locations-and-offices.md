# 15i: Locations and offices

- **Status:** done
- **Milestone:** M1 Local dev site
- **Depends on:** 15e

## Goal

Realistic offices. The only office was "Rathaus", which is a building, and it
was responsible for everything, building permits included. A town has offices
(Ämter), and several of them share a building.

## Decisions (the user, 2026-09-30)

1. **Locations are taxonomy terms** (the vocabulary `location`): the building's
   name, its address (translatable, the street names differ by language) and a
   photo. Locations have no page of their own.
2. **An office references its location** (`field_location`, required). It loses
   its own address and hero image: its header shows the location's photo, so one
   photo per building covers all its offices.
3. **Opening hours stay on the office:** they differ within a building (the
   residents' services open on Thursday evenings, building and planning only in
   the mornings). No fallback to the location's hours.
4. **Five locations, nine offices:**

   | Location              | Offices                                                    |
   | --------------------- | ---------------------------------------------------------- |
   | Town hall             | Municipal chancery, residents' services, finance and taxes |
   | Administrative centre | Building and planning, social services                     |
   | Works yard            | Public works, utilities                                    |
   | Seefeld school        | Schools office                                             |
   | Lakeside pool         | Sport and leisure                                          |

5. **Photos:** the user generates them with an image AI from a brief (below):
   one shared part for the town, one line per image. They replace the three
   placeholders (lake, meadow, old town) too: every use gets its own photo. JPEG
   at quality 82 (about 400 kB each); the credit is "AI-generated".

## Tasks

- [x] The vocabulary, its fields, translation settings and form;
      `field_location` on the office; the office's address and hero image
      removed
- [x] GraphQL (the term type, its fields), permissions (editors edit the
      locations, translators translate them)
- [x] The seeder: `terms.yml` and `{ term: key }`
- [x] The content: the locations, their placeholder photos, the nine offices;
      the building permits, the pool news and the footer point at their office
- [x] The frontend: the office's header, address and contact box, the office
      teaser

## Notes

- **The header's image** (`Host/Header`): `static-image` shows an image that
  isn't the host's own field, without a drop target. The office passes its
  location's photo.
- **The address** is the location's name above its address, on the office page
  and in the contact box.
- **The general contact** (the footer, the header's "Contact" link) is the
  municipal chancery, which has the main number.
- **The pool as a location** was a suggestion the user hasn't confirmed; the
  alternative is its office under public works. The sport and leisure office is
  there: the pool's own hours belong on its page (14b), not on an office.
- **Left for 14b:** the library item "counter-hours" on the building permits
  page and the home page's "Today" still give the old town hall hours.
- **Checked:** the offices in EN, DE and FR, the building permits' contact box,
  the search, an office in the editor; `bun run verify` (all 10 gates).

## The photo brief

The shared part, for every image:

> Photos for the website of Blockingen (in French: Bloquens), a fictional Swiss
> municipality of about 15,000 people. The town is bilingual, German and French,
> and lies on the shore of a lake at the foot of wooded hills, with vineyards on
> the slopes above it. It has a small historic old town, a railway station,
> residential quarters, and some light industry at its edge.
>
> The place: an ordinary, well-kept Swiss small town, lived in, not a postcard.
> Its buildings are what you'd find there: stone and plastered houses with steep
> tiled roofs in the old town, and buildings from every decade since, including
> plain post-war and contemporary ones.
>
> The photos: documentary photographs, as a municipality would commission from a
> local photographer for its website. Eye level, natural daylight, true-to-life
> colours, a calm and friendly mood. The same season and light across the whole
> set: late summer, soft sun or light cloud. They should look like one town.
>
> People: few and incidental, going about their day. Nobody posing or looking at
> the camera.
>
> Avoid: legible text of any kind (signs, lettering on buildings or vehicles,
> number plates); keep signs blank or out of focus. No logos, no coats of arms,
> no real or recognisable places or landmarks. No drone or fisheye shots, no
> HDR, no dramatic skies, no heavy filters, nothing that looks illustrated or
> rendered.
>
> Format: landscape 3:2, at least 2400 × 1600 px. The website also crops them to
> a wide 5:2 strip, so keep the subject within the middle three fifths of the
> height: the top and bottom fifth may be cut.

Then one line per image, only what it shows, e.g. `town-hall`: "the town hall, a
historic building in the old town near the lake", or `building-profiles`:
"profile poles (Bauprofile) marking a planned building on a plot". The file
names are the media keys in `drupal/content/media.yml`.
