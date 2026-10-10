import type { Language } from '#shared/utils/languages'

export type WelcomeTask =
  | 'analyze'
  | 'translate'
  | 'review'
  | 'schedule'
  | 'reuse'
  | 'agent'

type Texts = {
  title: string
  intro: string
  start: string
  startText: string
  tasksTitle: string
  openEditor: string
  tasks: Record<WelcomeTask, { title: string; text: string }>
  premium: { label: string; title: string; text: string }
  moreTitle: string
  more: { chart: string; footer: string; roles: string }
  sandboxTitle: string
  expires: string
  expiresIdle: string
  copyLink: string
  copy: string
  copied: string
  inviteTitle: string
  inviteText: string
  developersTitle: string
  developersText: string
  links: { docs: string; code: string; module: string; skills: string }
}

// The welcome page's strings: about blökkli, not the town, so they aren't in
// Drupal's texts. German: formal, Swiss spelling. English: British. Labels of
// the editor in quotes are its own.
export const WELCOME_TEXTS: Record<Language, Texts> = {
  en: {
    title: 'Your sandbox is ready',
    intro:
      'This is the website of Blockingen, a fictional Swiss municipality, and it’s yours to change: nobody else sees it. You work as Anna Keller, an editor.',
    start: 'Edit the lakeside pool page',
    startText:
      'Drag blocks around, add new ones and click into any text to change it. Your changes stay a draft until you publish them.',
    tasksTitle: 'Things to try',
    openEditor: 'Open in the editor',
    tasks: {
      analyze: {
        title: 'Find the mistakes',
        text: 'The lakeside pool page has a few planted mistakes, such as an image without alt text and a table without a header row. Open “Analyze” in the editor and fix what it finds.',
      },
      translate: {
        title: 'Bring the French up to date',
        text: 'The French version of “The lakeside pool opens on Saturday” is outdated: its opening hours are wrong. Open it, see which blocks are flagged, and correct the hours.',
      },
      review: {
        title: 'Get a page reviewed',
        text: 'On “Applying for a building permit”, Anna asked Marc Brunner, the head of department, whether the counter hours are still right, and he replied. Answer in the thread, or mention someone with @. To see it from Marc’s side, open his link below in a private window.',
      },
      schedule: {
        title: 'Schedule a publication',
        text: '“The lakeside pool opens on Saturday” isn’t published yet: it publishes itself on a set date. Change the date, or publish it right away. With the preview’s QR code, you check a page on your phone first.',
      },
      reuse: {
        title: 'Reuse instead of copying',
        text: 'The table on “What goes where?” comes from the library: change it here, and it changes on every page that shows it. You can also move blocks into the sidebar, or import them from another page.',
      },
      agent: {
        title: 'Work with the AI assistant',
        text: 'Ask it to check the page against the town’s style guide, to link related pages, or to write a service page with the town’s real fees. You approve every change.',
      },
    },
    premium: {
      label: 'Premium',
      title: 'The AI assistant',
      text: 'In premium sandboxes, an AI assistant works with you: it checks pages against a style guide, links related pages and writes new ones. Premium sandboxes are by invitation.',
    },
    moreTitle: 'More to try',
    more: {
      chart:
        'Change a chart on “Blockingen in numbers”: switch its type, or edit its numbers.',
      footer:
        'Edit the footer: every page shows it, and you edit it like a page.',
      roles:
        'Try the other roles: Jonas Weber may not add sections, nor add, change or delete charts, and Élodie Favre only translates: she can’t take over a page someone else is editing. Their links are under “Your sandbox”.',
    },
    sandboxTitle: 'Your sandbox',
    expires: 'Your sandbox is deleted on @date.',
    expiresIdle:
      'Your sandbox is deleted on @date, or after @hours hours without use.',
    copyLink: 'Copy the link to this sandbox',
    copy: 'Copy the link',
    copied: 'Copied',
    inviteTitle: 'Invite a colleague',
    inviteText:
      'Each link logs your colleague in as that user, until the sandbox is deleted. To try a role yourself, open its link in a private window.',
    developersTitle: 'For developers',
    developersText:
      'blökkli is open source. On Drupal, it works with the module Paragraphs blökkli, and it comes with skills for Claude Code that set up a site like this one.',
    links: {
      docs: 'Documentation',
      code: 'Source code on GitHub',
      module: 'Paragraphs blökkli on drupal.org',
      skills: 'The skills for Claude Code',
    },
  },
  de: {
    title: 'Ihre Sandbox ist bereit',
    intro:
      'Das ist die Website von Blockingen, einer fiktiven Schweizer Gemeinde, und Sie dürfen sie nach Belieben verändern: Niemand sonst sieht sie. Sie arbeiten als Anna Keller, Redaktorin.',
    start: 'Seite «Strandbad» bearbeiten',
    startText:
      'Verschieben Sie Blöcke, fügen Sie neue hinzu und klicken Sie in einen Text, um ihn zu ändern. Ihre Änderungen bleiben ein Entwurf, bis Sie sie veröffentlichen.',
    tasksTitle: 'Was Sie ausprobieren können',
    openEditor: 'Im Editor öffnen',
    tasks: {
      analyze: {
        title: 'Fehler finden',
        text: 'Auf der Seite «Strandbad» stecken ein paar absichtliche Fehler, zum Beispiel ein Bild ohne Alternativtext und eine Tabelle ohne Kopfzeile. Öffnen Sie im Editor «Analysieren» und beheben Sie, was es findet.',
      },
      translate: {
        title: 'Das Französische aktualisieren',
        text: 'Die französische Fassung von «Das Strandbad öffnet am Samstag» ist veraltet: Die Öffnungszeiten stimmen nicht. Öffnen Sie sie, sehen Sie nach, welche Blöcke markiert sind, und korrigieren Sie die Zeiten.',
      },
      review: {
        title: 'Eine Seite prüfen lassen',
        text: 'Auf «Baugesuch einreichen» hat Anna Marc Brunner von der Abteilungsleitung gefragt, ob die Schalterzeiten noch stimmen, und er hat geantwortet. Antworten Sie im Kommentar, oder erwähnen Sie jemanden mit @. Um es aus Marcs Sicht zu sehen, öffnen Sie seinen Link unten in einem privaten Fenster.',
      },
      schedule: {
        title: 'Eine Veröffentlichung planen',
        text: '«Das Strandbad öffnet am Samstag» ist noch nicht veröffentlicht: Die Meldung erscheint an einem festgelegten Datum von selbst. Ändern Sie das Datum, oder veröffentlichen Sie sie sofort. Mit dem QR-Code der Vorschau prüfen Sie eine Seite vorher auf dem Handy.',
      },
      reuse: {
        title: 'Wiederverwenden statt kopieren',
        text: 'Die Tabelle auf «Was gehört wohin?» kommt aus der Bibliothek: Ändern Sie sie hier, ändert sie sich auf jeder Seite, die sie zeigt. Sie können auch Blöcke in die Seitenleiste verschieben oder von einer anderen Seite importieren.',
      },
      agent: {
        title: 'Mit dem KI-Assistenten arbeiten',
        text: 'Lassen Sie ihn die Seite nach dem Styleguide der Gemeinde prüfen, verwandte Seiten verlinken oder eine Dienstleistungsseite mit den echten Gebühren der Gemeinde schreiben. Jede Änderung geben Sie selbst frei.',
      },
    },
    premium: {
      label: 'Premium',
      title: 'Der KI-Assistent',
      text: 'In Premium-Sandboxes arbeitet ein KI-Assistent mit: Er prüft Seiten nach einem Styleguide, verlinkt verwandte Seiten und schreibt neue. Premium-Sandboxes gibt es auf Einladung.',
    },
    moreTitle: 'Mehr zum Ausprobieren',
    more: {
      chart:
        'Ändern Sie ein Diagramm auf «Blockingen in Zahlen»: seinen Typ oder seine Zahlen.',
      footer:
        'Bearbeiten Sie die Fusszeile: Jede Seite zeigt sie, und Sie bearbeiten sie wie eine Seite.',
      roles:
        'Probieren Sie die anderen Rollen aus: Jonas Weber darf keine Abschnitte hinzufügen und Diagramme weder hinzufügen, ändern noch löschen, und Élodie Favre übersetzt nur: Sie kann keine Seite übernehmen, die jemand anderes bearbeitet. Ihre Links finden Sie unter «Ihre Sandbox».',
    },
    sandboxTitle: 'Ihre Sandbox',
    expires: 'Ihre Sandbox wird am @date gelöscht.',
    expiresIdle:
      'Ihre Sandbox wird am @date gelöscht, oder nach @hours Stunden ohne Nutzung.',
    copyLink: 'Link zu dieser Sandbox kopieren',
    copy: 'Link kopieren',
    copied: 'Kopiert',
    inviteTitle: 'Kollegin oder Kollegen einladen',
    inviteText:
      'Jeder Link meldet Ihre Kollegin oder Ihren Kollegen als diese Person an, bis die Sandbox gelöscht wird. Um eine Rolle selbst auszuprobieren, öffnen Sie ihren Link in einem privaten Fenster.',
    developersTitle: 'Für Entwicklerinnen und Entwickler',
    developersText:
      'blökkli ist Open Source. Mit Drupal arbeitet es über das Modul Paragraphs blökkli, und es bringt Skills für Claude Code mit, die eine Website wie diese einrichten.',
    links: {
      docs: 'Dokumentation',
      code: 'Quellcode auf GitHub',
      module: 'Paragraphs blökkli auf drupal.org',
      skills: 'Die Skills für Claude Code',
    },
  },
  fr: {
    title: 'Votre sandbox est prête',
    intro:
      'Voici le site web de Bloquens, une commune suisse fictive, et vous pouvez le modifier à votre guise : personne d’autre ne le voit. Vous travaillez en tant qu’Anna Keller, rédactrice.',
    start: 'Modifier la page « Plage »',
    startText:
      'Déplacez des blocs, ajoutez-en de nouveaux et cliquez dans un texte pour le modifier. Vos modifications restent un brouillon jusqu’à ce que vous les publiiez.',
    tasksTitle: 'À essayer',
    openEditor: 'Ouvrir dans l’éditeur',
    tasks: {
      analyze: {
        title: 'Trouver les erreurs',
        text: 'La page « Plage » contient quelques erreurs volontaires, comme une image sans texte alternatif et un tableau sans ligne d’en-tête. Ouvrez l’analyse dans l’éditeur et corrigez ce qu’elle trouve.',
      },
      translate: {
        title: 'Mettre le français à jour',
        text: 'La version française de « La plage rouvre samedi » est obsolète : ses horaires sont faux. Ouvrez-la, regardez quels blocs sont signalés et corrigez les horaires.',
      },
      review: {
        title: 'Faire relire une page',
        text: 'Sur « Déposer une demande de permis de construire », Anna a demandé à Marc Brunner, de la direction de service, si les horaires du guichet sont toujours justes, et il a répondu. Répondez dans le commentaire, ou mentionnez quelqu’un avec @. Pour voir ce que voit Marc, ouvrez son lien ci-dessous dans une fenêtre privée.',
      },
      schedule: {
        title: 'Planifier une publication',
        text: '« La plage rouvre samedi » n’est pas encore publiée : l’actualité paraîtra d’elle-même à une date fixée. Changez la date, ou publiez-la tout de suite. Avec le code QR de l’aperçu, vous vérifiez d’abord une page sur votre téléphone.',
      },
      reuse: {
        title: 'Réutiliser plutôt que copier',
        text: 'Le tableau de « Que jeter où ? » vient de la bibliothèque : modifiez-le ici, et il change sur toutes les pages qui l’affichent. Vous pouvez aussi déplacer des blocs dans la barre latérale, ou en importer d’une autre page.',
      },
      agent: {
        title: 'Travailler avec l’assistant IA',
        text: 'Demandez-lui de vérifier la page selon le guide de rédaction de la commune, de lier des pages apparentées ou de rédiger une page de prestation avec les vrais tarifs de la commune. Vous validez chaque modification.',
      },
    },
    premium: {
      label: 'Premium',
      title: 'L’assistant IA',
      text: 'Dans les sandboxes premium, un assistant IA travaille avec vous : il vérifie les pages selon un guide de rédaction, lie des pages apparentées et en rédige de nouvelles. Les sandboxes premium sont sur invitation.',
    },
    moreTitle: 'Autres choses à essayer',
    more: {
      chart:
        'Modifiez un graphique de « Bloquens en chiffres » : son type ou ses chiffres.',
      footer:
        'Modifiez le pied de page : toutes les pages l’affichent, et vous le modifiez comme une page.',
      roles:
        'Essayez les autres rôles : Jonas Weber ne peut pas ajouter de sections, ni ajouter, modifier ou supprimer de graphiques, et Élodie Favre ne fait que traduire : elle ne peut pas reprendre une page qu’une autre personne modifie. Leurs liens se trouvent sous « Votre sandbox ».',
    },
    sandboxTitle: 'Votre sandbox',
    expires: 'Votre sandbox sera supprimée le @date.',
    expiresIdle:
      'Votre sandbox sera supprimée le @date, ou après @hours heures sans utilisation.',
    copyLink: 'Copier le lien vers cette sandbox',
    copy: 'Copier le lien',
    copied: 'Copié',
    inviteTitle: 'Inviter une ou un collègue',
    inviteText:
      'Chaque lien connecte votre collègue sous ce compte, jusqu’à la suppression de la sandbox. Pour essayer un rôle vous-même, ouvrez son lien dans une fenêtre privée.',
    developersTitle: 'Pour les développeuses et développeurs',
    developersText:
      'blökkli est open source. Avec Drupal, il fonctionne grâce au module Paragraphs blökkli, et il est livré avec des skills pour Claude Code qui configurent un site comme celui-ci.',
    links: {
      docs: 'Documentation',
      code: 'Code source sur GitHub',
      module: 'Paragraphs blökkli sur drupal.org',
      skills: 'Les skills pour Claude Code',
    },
  },
}
