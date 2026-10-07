# 09c: The welcome page

- **Status:** done (2026-10-07)
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 09, 09b; 14b's content

## Goal

After a claim, visitors land on a page that suggests what to try. Each task is a
link into the editor of the page where it works.

## Tasks

- [x] **The page** (`pages/welcome.vue`): `/en/welcome`, `/de/willkommen`,
      `/fr/bienvenue`.
  - Nuxt only. Its texts are in the code, in all three languages
    (`utils/welcomeTexts.ts`), not in Drupal's texts.
  - In the site's layout (`drupal`): the toolbar with the Sandbox button, the
    header and the footer. Drupal doesn't know its paths, so the header has no
    language switch there.
  - A button into the lakeside pool's editor, six tasks, more to try, the
    sandbox, and links for developers.
- [x] **The tasks,** each opening a page's editor:

  | Task                        | Opens                                                | Shows                                                    |
  | --------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
  | Find the mistakes           | the lakeside pool                                    | Analyze: the missing alt text, the table's header row    |
  | Bring the French up to date | the pool opening, in French                          | the outdated translation                                 |
  | Get a page reviewed         | "Applying for a building permit", with Anna's thread | comments, mentions, Marc's side in a private window      |
  | Schedule a publication      | the pool opening                                     | scheduling, the preview's QR code                        |
  | Reuse instead of copying    | "What goes where?"                                   | a library item, the sidebar, importing from another page |
  | Work with the AI assistant  | the fees page                                        | the agent's three prompts                                |
  - The agent's task appears where the agent is available
    (`paragraphsBlokkliAvailableFeatures`). Elsewhere it's a teaser: premium
    sandboxes are by invitation.
  - A task whose page the visitor can't see is left out.

- [x] **More to try:**
  - a chart on "Blockingen in numbers";
  - the footer, a config page;
  - the other roles, whose links are in the sandbox's part.
- [x] **The sandbox's part,** like the popup: the expiry, the link to come back,
      the colleagues' links. `useSandbox()` shares the query and the copying
      with the popup.
- [x] **The links:**
  - The query `welcome` loads the pages by their UUIDs, which the seeder derives
    from the content's keys. Each comes with its paths in every language.
  - The tasks open the content's original language (`defaultLangcode`). The
    editor opens a translation in translation mode, where nothing can be added.
  - Only the French task opens a translation. It's left out when French is the
    original.
  - The thread opens with `blokkliComment` (its UUID, also derived).
- [x] **The claim:** the login URL gets `?destination=` with the welcome page's
      path in the content's language (`shared/utils/welcome.ts`), which core's
      RedirectResponseSubscriber follows. The sandbox's own link and the
      colleagues' still open the editor.
- [x] **The popup** stays closed until it's clicked. It links to the welcome
      page (`sandbox.welcome`).
- [x] **The claim page, simplified** (the user, 2026-10-07):
  - One choice of language, in boxes with a check: it switches the page's
    language and is the content's. It replaces the header's language links and
    the content language's radios. A language without a template is greyed out.
  - No header: a white box with the logo and the content on a grey page.
  - The control app's own stylesheet (`app/assets/css/main.css`) imports the
    frontend's and adds the Logo as a source. Tailwind only scanned the control
    app's files, so the Logo's colours were missing (a black shield).
- [x] **The test roles see unpublished nodes** (the user, 2026-10-06):
  - The nodes belong to the admin, and core only has
    `view own unpublished content`. So no test user could open the pool opening,
    which is unpublished until its date: `route` and `entityByUuid` answered
    null, and the welcome page left out two tasks.
  - `view any unpublished content` comes from Content Moderation, which the site
    doesn't use. The contrib module `view_unpublished` (1.4.0) brings it,
    through node grants. The four roles have it.
  - Installing the module flags node access for a rebuild. The seed rebuilds it
    at its end, which clears the flag.
  - The `blokkli-setup-permissions` skill (1.0.2) names the permission.
- [x] The browser checks (below): passed (the user, 2026-10-07).

## Decisions (the user, 2026-10-06)

- After a claim, a welcome page instead of the home page's editor. Nuxt only,
  with the texts in the code in all three languages.
- Outside premium sandboxes, the agent's task is a teaser card.
- The sandbox's own link and the colleagues' links keep opening the editor.
- Translated paths.
- **No contact on the agent's teaser for now.** Asking for a premium sandbox
  becomes an automated process in a follow-up, e.g. a form with a name and an
  email address.
- The page is in the claim page's language, which is the content's (since
  2026-10-07). Its tasks open the content's original language.

## Verification (2026-10-06)

- **The paths:** `/en/welcome`, `/de/willkommen` and `/fr/bienvenue` answer 200
  with their titles. `/de/welcome` is a Drupal path (403 for anonymous
  visitors).
- **A claim from the French claim page:**
  - the login URL ends in `?destination=%2Ffr%2Fbienvenue`;
  - the login answers 302 to `/fr/bienvenue`, which answers 200;
  - the sandbox query has the four logins, with the roles in French.
- **The query `welcome`, through the Nuxt proxy:**
  - As Anna on the dev site: every page with its three paths, German marked as
    the original. The pool opening is null (above). The agent is available.
  - In the normal sandbox: the agent isn't available.
- **`view_unpublished`, after both bakes:**
  - the rebuild flag is cleared, and `node_access` has the module's grants for
    the pool opening's three translations;
  - all four test users get the pool opening from the query `welcome`;
  - anonymous visitors still get nothing for its path.
- **`bun run verify`:** every gate.

**In the browser (the user, 2026-10-07), all passed:**

- A claim from each claim page lands on its welcome page.
- Each task opens the right page's editor, in the original language. The French
  one opens the French.
- "Get a page reviewed" opens Anna's thread.
- A normal sandbox shows the teaser; a premium one (an invitation) shows the
  agent's task.
- The copy buttons.
- The popup stays closed until it's clicked, and its link opens the welcome
  page.
- The page at phone width.

## Notes

- **Found:** a comment's label throws
  ([F52](findings.md#f52-a-comments-label-throws)).
- The link to the skills (`github.com/blokkli/editor/tree/main/skills`) works
  once this branch is merged.
