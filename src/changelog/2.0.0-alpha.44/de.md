---
date: "2026-03-12"
---

### Neue Funktionen

- **Überschriftenstruktur-Analyse**: Ein neuer Analysator prüft die Überschriftenhierarchie auf der Seite (H1–H6) und markiert Probleme wie mehrfache H1-Überschriften oder übersprungene Ebenen.
- **Alt-Text-Analyse für Bilder**: Ein neuer Barrierefreiheits-Analysator hebt Bilder ohne Alt-Text direkt auf der Seite hervor.
- **Analyse-Tooltips im Artboard**: Wenn das Analyse-Panel aktiv ist, erscheint beim Hovern über ein markiertes Element ein Tooltip mit dem Titel des Problems und dem Lesbarkeitswert.
- **Lesbarkeitswert im Bearbeitungs-Overlay**: Beim Bearbeiten eines Rich-Text-Feldes wird der Lesbarkeitswert für den gesamten Text in der Werkzeugleiste oberhalb des Feldes angezeigt.
- **Übergeordneten Block auswählen**: Die Block-Aktionsleiste hat jetzt eine Schaltfläche, mit der Sie schnell den übergeordneten Block auswählen können.
- **Block-Verschieben-Schaltfläche**: Ein Ziehpunkt in der Aktionsleiste ermöglicht es, Blöcke direkt von der Werkzeugleiste aus zu verschieben.
- **Fuzzy-Suche beim Hinzufügen von Blöcken**: Die Block-Auswahl verwendet jetzt Fuzzy-Matching, sodass auch ungenaue Suchbegriffe den richtigen Blocktyp finden. Das Suchfeld wird beim Öffnen automatisch fokussiert.

### Verbesserungen

- Der Schalter «Ergebnisse sichtbar lassen» im Analyse-Panel zeigt jetzt eine Beschreibung, die erklärt, dass Ergebnisse auf der Seite hervorgehoben bleiben, auch wenn das Panel geschlossen wird.

### Fehlerbehebungen

- Der Bearbeitungsindikator wurde nach dem Wechsel in den Bearbeitungsmodus nicht angezeigt.
- Die fixierte Block-Aktionsleiste sprang manchmal an die falsche Position.
- Ein visueller Fehler im Auswahl-Renderer beim Auswählen eines Host-Elements und gleichzeitigem Öffnen des Kontextmenüs wurde behoben.
- Block-Optionen wurden beim Öffnen eines Dialogs nicht übermittelt.
- Der Sprachumschalter wurde auch dann angezeigt, wenn nur eine Sprache verfügbar war.
- Lesbarkeitswerte wurden für Rich-Text-Felder mit mehreren Abschnitten falsch berechnet.
- Die deutschen Lesbarkeits-Schwellenwerte wurden angepasst, um den tatsächlichen Schwierigkeitsgrad besser widerzuspiegeln.
