---
date: '2026-04-07'
---

### Neue Funktionen

#### Analyse-Ergebnisse ignorieren

Einzelne Analyse-Ergebnisse (z.B. Lesbarkeit eines Textes) können ignoriert
werden. Die ignorierten Ergebnisse bleiben auch nach publizieren der Änderungen
erhalten. In der Analyse-Sidebar werden die ignorierten Ergebnisse angezeigt und
können dort wiederhergestellt werden.

#### Veraltete Übersetzungen

Blöcke mit veralteten Übersetzungen werden im Editor hervorgehoben und können
über die Navigation in der Übersetzungsleiste der Reihe nach durchgegangen und
als aktuell markiert werden. Eine Übersetzung wird automatisch als veraltet
markiert wenn eine Änderung in der Originalsprache gemacht wird.

#### Automatische Übersetzung (DeepL)

Über den Button «Automatisch übersetzen...» in der Übersetzungsleiste können
alle Texte automatisch via DeepL übersetzt werden. Einzelne Textfelder können
auch direkt über den «Übersetzen»-Button im Textfeld übersetzt werden.

#### Übersetzungen importieren und exportieren

Übersetzungen können als CSV- oder PO-Dateien exportiert und importiert werden.
Dabei kann nach veralteten oder fehlenden Übersetzungen gefiltert werden.
Änderungen werden vor dem Import in einer Vorschau angezeigt.

#### Seite wechseln

Über den neuen Button «Seite wechseln» kann direkt zu einer anderen Seite
gesprungen werden, ohne den Editor zu verlassen. Diese Funktion ist auch über
`Ctrl + P` (Windows) oder `Cmd + P` (macOS) aufrufbar.

#### Verwandte Inhalte

Ausgewählte Blöcke zeigen jetzt verknüpfte Inhalte wie Seiten, Bilder oder
Dokumente an. Diese können direkt aus dem Editor heraus bearbeitet werden.

### Verbesserungen

- Rich-Text-Felder können für komfortableres Bearbeiten im Vollbild geöffnet
  werden.
- Rich-Text-Felder zeigen beim Bearbeiten eine formatierte Vorschau an.
- Über Rechtsklick auf die Zoom-Anzeige können Zoomstufen direkt ausgewählt
  werden.
- Die Darstellung der Analyse-Ergebnisse wurde überarbeitet und zeigt jetzt ein
  Label an mit dem Problem.
- Unterhaltungen mit «Superblökkli» können bewertet werden. Die Bewertungen
  werden verwendet um den Agenten zu verbessern.

### Fehlerbehebungen

- In der Struktur-Ansicht in der Sidebar konnten Blöcke beliebig verschoben
  werden, was zu ungültigen Zuständen führte. Dies wird jetzt validiert.
- Wurde ein Rich-Text-Feld ohne Änderung geschlossen konnte es passieren dass
  trotzdem eine Änderung im Verlauf registriert wurde. Das kann jetzt nicht mehr
  passieren.
