const DE = {
  deleteButton: 'Löschen',
  deleteError: 'Das Element konnte nicht entfernt werden.',
  deleteMultipleError: 'Die Elemente konnten nicht entfernt werden.',
  resetZoom: 'Zoom zurücksetzen',
  clipboard: 'Zwischenablage',
  clipboardEmpty: 'Keine Elemente in der Zwischenablage',
  clipboardExplanation: `<p>
    Verwenden Sie Ctrl-V auf der Seite um Inhalte einzufügen. Diese
    werden dann hier angezeigt.
  </p>
  <p>
    Verwenden Sie Ctrl-F um bestehende Inhalte zu suchen und in die
    Zwischenablage einzufügen.
  </p>`,
  comments: 'Kommentare',
  commentBody: 'Kommentar',
  commentSave: 'Kommentar speichern',
  addCommentToItem: 'Kommentieren',

  convertTo: 'Konvertieren zu...',
  failedToConvert: 'Das Element konnte nicht konvertiert werden.',

  multipleItemsLabel: 'Elemente',
}

type ValidTextKeys = keyof typeof DE
export type BlokkliTextProvider = (key: ValidTextKeys) => string

export default function (): BlokkliTextProvider {
  return (key: ValidTextKeys) => DE[key]
}
