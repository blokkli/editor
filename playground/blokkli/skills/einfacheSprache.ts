import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'einfache-sprache',
  description:
    'Regeln für "einfache Sprache" auf Deutsch. Benutze dies wenn du Texte erstellen musst.',
  getContents: () => {
    return `## SPRACHLICHE RICHTLINIEN:

### Einfache Sprache

- Verwenden Sie allgemein bekannte Wörter. Beispiel: Brauchen Sie eine Brille?

- Ersetzen Sie Fach- und Fremdwörter wenn möglich durch alltagssprachliche
  Begriffe. Beispiele:
  - Rechtschreibung
  - Die Finanzbranche erzeugt rund ein Drittel des Gewinns in der Stadt.

- Verwenden Sie Fachwörter, wenn es keine alltagssprachliche Alternative gibt.
  Erklären Sie die Fachwörter dann so, dass das Zielpublikum sie versteht. Sie
  können diese zum Beispiel in Klammern oder in Fussnoten erklären. Beispiele:
  Diversitätsmerkmale (Merkmale der Vielfalt, wie beispielsweise Geschlecht,
  Alter, Nationalität)

- Schreiben Sie Abkürzungen mindestens bei der ersten Nennung aus. Beispiele:
  Mehrwertsteuer (MWST)

### Satzstruktur

- Verwenden Sie kurze Sätze. Faustregel: Ein Gedanke, ein Satz, möglichst keine
  Einschübe. Beispiele:
  - Kürzen Sie lange Sätze.
  - Wir möchten Ihnen den Start in Ihrer neuen Umgebung leichter machen. Deshalb
    bieten wir verschiedene Informationen und Kurse an. Wir beraten Sie auch
    persönlich.

- Verzichten Sie auf ausschmückende Details und Füllwörter. Beispiele: Die
  Stadtführerinnen zeigen Ihnen einige Sehenswürdigkeiten der Stadt.

- Verwenden Sie die aktive Verbform. Beispiele: Bitte füllen Sie das Formular
  aus.

- Vermeiden Sie wo möglich Nominalkonstruktionen. Nominalkonstruktionen
  entstehen, wenn aus einem Verb ein Nomen gemacht wird. Beispiele:
  - Wir beraten Sie kostenlos.
  - Wir planten den Anlass.

### Textaufbau

- Bauen Sie einen Text logisch auf.
  - In der Einleitung muss die Kernaussage des Texts enthalten sein.
  - Das Wichtigste kommt zuerst.
  - Machen Sie Absätze.
  - Zwischentitel geben dem Text eine Struktur.
  - Sprechen Sie jedes Thema nur einmal an.
  - Schreiben Sie folgerichtig, sodass jede Information auf der vorherigen
    aufbaut.
  - Halten Sie den roten Faden bis zum Schluss.

### Geschlechtergerechte Sprache

- Geschlechtsneutrale Begriffe Verwenden Sie geschlechtsneutrale Begriffe, um
  alle Personen unabhängig von ihrem Geschlecht anzusprechen.
  Geschlechtsneutrale Begriffe sind barrierefrei. Beispiele:
  - Die Mitteilung richtet sich an die Bevölkerung der Stadt Winterthur.
  - Die Fachpersonen der Stadtverwaltung

- Geschlechtsneutrale Pronomen Ersetzen Sie Pronomen wie jeder, jedermann,
  keiner, einer durch geschlechtsneutrale Pronomen. Beispiele:
  - Alle sind eingeladen.
  - Niemand darf benachteiligt werden.
  - Jemand sollte es wagen.
  - Wer über eine Matura oder ein Lehrpatent verfügt, muss keine Aufnahmeprüfung
    ablegen. Wenn Sie das Pronomen «wer» verwenden, achten Sie darauf, dass Sie
    den Satz nach dem Komma nicht mit «der» fortsetzen.

- Infinitiv Umschreiben Sie Sachverhalte mit dem Infinitiv. Formulierungen
  lassen sich damit stark vereinfachen. Beispiele:
  - Folgende Hinweise sind zu beachten…
  - Bitte beiliegendes Formular ausfüllen.
- Substantivierte Adjektive und Partizipien Das Substantivieren von Adjektiven
  und Partizipien stellt ein einfaches sprachliches Mittel für eine
  gendergerechte Formulierung dar. Beispiele:
  - Mitarbeitende
  - Stimmberechtigte
  - Gesuchstellende

- Passivformen Benutzen Sie zur Abwechslung passive Ausdrucksweisen. Verwenden
  Sie diese nicht zu oft, da sie unpersönlich sind und wichtige Sachverhalte
  oder Informationen verschleiern. Beispiele:
  - Die Kinderzulagen werden mit dem Lohn ausbezahlt.
  - Das Gerät muss so konstruiert werden, dass…

- Generisches Maskulin Die Verwendung der männlichen Form für alle Geschlechter,
  das sogenannte generische Maskulinum, ist nicht erlaubt. Auch ein genereller
  Hinweis, dass sich im vorliegenden Text die männliche Form sowohl auf Männer
  wie auf Frauen bezieht, ist nicht gestattet.

- Direkte Rede Sprechen Sie Ihr Zielpublikum direkt an. Wenn sich Ihr Text an
  eine bestimmte Person oder an eine Personengruppe wendet, machen Sie ihn durch
  die direkte Anrede attraktiver. Beispiele:
  - Bitte beachten Sie folgende Bibliotheksregeln: …
  - Sie sind teamfähig.

- Genderzeichen Innerhalb der Stadtverwaltung darf der Doppelpunkt als
  Genderzeichen verwendet werden. Das Genderzeichen weist darauf hin, dass nicht
  nur zwei Geschlechter existieren. So werden nicht nur Frauen und Männer,
  sondern auch nichtbinäre Menschen angesprochen und sichtbar gemacht.
  Beispiele: Die leitende Person bezeichnet eine Stellvertretung.

- Paarformen Paarformen machen nichtbinäre Personen nicht sichtbar, sind aber
  weiterhin eine gute Variante, um Männer und Frauen sprachlich gleichzustellen.
  Dies in Texten, in denen das Genderzeichen nicht zugelassen ist, und wenn es
  darum geht, eine Häufung des Genderzeichens zu vermeiden oder eine einfache
  Sprache zu wählen. Die Paarform eignet sich zudem für die gesprochene Sprache.
  Benutze aber den Gender Doppelpunkt bevorzugt zu Paarformen. Beispiele:
  - Am Technikum Winterthur sind 90 Studentinnen und 900 Studenten
    eingeschrieben
  - Alle Mitarbeiterinnen und Mitarbeiter haben grossen Einsatz geleistet.
  - Die Stimmbürgerinnen und Stimmbürger

- Anreden, Titel, Funktionsbezeichnungen Wählen Sie Anreden, die Personen aller
  Geschlechter die gleiche Bedeutung beimessen. Eine korrekte persönliche Anrede
  ist Ausdruck von Wertschätzung. Sind Sie unsicher, wie sich eine Person
  identifiziert, verzichten Sie auf geschlechterspezifische Anreden. Weder
  «Frau» noch «Herr» werden geschrieben – ausser in Anreden in Briefen oder
  Ansprachen. Auch akademische Titel und Grade werden in der Regel nicht
  angegeben. Beispiele:
  - «Familie Susanne und Peter Müller-Mettler» oder «Frau und Herr Susanne und
    Peter Müller-Mettler
  - Frau Monika Meier Huber und Herr Markus Huber-Meier

- Zusammengesetzte Wörter Viele zusammengesetzte Wörter sind nicht
  geschlechtsneutral. Formulieren Sie diese neu. Beispiele:
  - Fahrausweis
  - lesefreundlich

## TECHNISCHE SCHREIBWEISUNGEN:

### Anführungszeichen

- Es werden « und » verwendet und keine Gänsefüsschen „ oder "
- Beispiel: Bundesrat Merz führte aus: «Der Bundesrat vertritt die Ansicht, dass
  der ‹Tagesanzeiger› den Sachverhalt korrekt dargestellt hat.»

### Bindestrich vs. Gedankenstrich

- Bindestrich (-): Wird verwendet als Kupplungsbindestrich in zusammengesetzten
  Wörtern sowie als Ergänzungsstrich
  - Beispiele: Pro-Kopf-Verbrauch, Von-Wattenwyl-Gespräche, 18-jährig,
    99-prozentig, 90er-Jahre, Abstimmungs- und Wahlunterlagen
- Gedankenstrich (–): Wird zur Abtrennung von Nachträgen im Satz und
  eingeschobene Sätze oder Satzteile verwendet. Er wird u. a. anstelle der
  Präposition «bis» verwendet. Er dient zudem als Ersatz für Nullen in
  Geldbeträgen.
  - Beispiele: Das E-Voting – das eine Reihe von politischen Fragen aufwirft –
    könnte sich langfristig durchsetzen. / 16–17 Uhr / 2024–2026 / Fr. 23.–

### Kurzbezeichnungen

- Kurzbezeichnungen sind mit grossem Anfangsbuchstaben zu schreiben. Die
  nachfolgenden Buchstaben sind kleinzuschreiben.
- Sonderzeichen und Interpunktionen innerhalb von Wörtern und Kurzbezeichnungen
  – mit Ausnahme des Doppelpunkts als Genderzeichen – sowie
  Binnengrossschreibung sind nicht zulässig.
- Beispiel: Schucom statt SCHU::COM / Das Projekt Cirque statt CIRQUE

### Zahlen und Ziffern

- Ein- und zweisilbige Zahlen werden grundsätzlich in Worten geschrieben,
  längere Zahlen dagegen in Ziffern.
- Vorrang hat die Lesefreundlichkeit. Stehen sich in einem Text mehrere
  Zahlenangaben gegenüber, so ist es lesefreundlicher, nur Ziffern zu verwenden.
- Beispiele: null, eins, zwei, fünf, zehn, elf, zwölf, vierzehn, sechzehn,
  zwanzig, 21, 22, 23, dreissig, vierzig, neunzig, hundert, tausend, eine
  Million
- Die Zahlen «Million» und «Milliarde» werden im Fliesstext grundsätzlich in
  Worten geschrieben, in verknapptem Text abgekürzt mit «Mio.» und «Mrd.»

### Gruppierung von Ziffern

- Ziffern werden in Dreiergruppen zusammengefasst. Besteht eine Zahl aus vier
  Ziffern, so wird die erste Ziffer nicht abgesetzt – Ausnahme: in
  tabellarischen Darstellungen.
- Zur Gliederung der Dreiergruppen wird ein Hochkomma (Apostroph) verwendet.
- Beispiele: 135'278'789 oder 22'754, aber 1435 (in Tabellen: 1'435)

### Dezimalzahlen

- Dezimalstellen werden durch das Dezimalkomma abgetrennt.
- Bei Geldbeträgen ist zwischen der Währungseinheit und der Untereinheit
  anstelle des Dezimalkommas der Dezimalpunkt zu setzen. Die Nullen der Einheit
  bzw. Untereinheit werden durch einen Gedankenstrich ersetzt.
- Beispiele: 88,5 Meter / Fr. 23.50, Fr. 30.–, Fr. –.15 / aber: 22,5 Rappen bzw.
  22,5 Rp. / 4,16 Millionen Franken

### Datum

- Bei Datumsangaben ist der Monatsname stets auszuschreiben.
- Auch in verknapptem Text ist die Jahreszahl vierstellig zu schreiben, längere
  Monatsnamen werden abgekürzt.
- Bei der Schreibweise in Ziffern wird auf die vorangestellte Null verzichtet.
  Zulässig sind Führungsnullen jedoch insbesondere bei Tabellendarstellungen.
- Beispiele: Am 20. März 2012 soll es ein Gewitter geben. / 30. Dez. 2006 /
  3.5.2024 und 03.05.2024

### Geldbeträge

- Im Fliesstext werden Währungseinheiten ausgeschrieben. Dem Sprech- und
  Lesefluss entsprechend wird zuerst die Zahl, dann die Währungseinheit
  geschrieben.
- Werden Geldbeträge auf die Kommastelle genau angegeben, so ist die abgekürzte
  Schreibweise zu verwenden.
- In verknapptem Text wird die Währungseinheit abgekürzt und vor die Zahl
  gesetzt.
- Die Wörter «Million (Mio.)» und «Milliarde (Mrd.)» stehen immer hinter dem
  Geldbetrag.
- Beispiele: 20 Franken, 467 Euro, 4,16 Millionen Franken / Fr. 367.85 statt
  367.85 Franken / Fr. 20'000.– / 2,3 Mio. Fr.

### Einheiten

- Im Fliesstext dürfen Einheiten sowohl ausgeschrieben als auch abgekürzt
  werden, insbesondere wenn vor der Einheit eine Zahl in Ziffern steht.
- Beispiele: 10 Gramm, 10 g; 50 Kubikzentimeter, 50 cm³; 90 Kilowattstunden, 90
  kWh; 1000 Quadratmeter, 1000 m²

### Prozent

- Der Ausdruck Prozent (auch Promille) wird grundsätzlich in Worten geschrieben.
  Bei einer Häufung von Prozentangaben darf auch das Begriffszeichen «%» der
  Lesefreundlichkeit zuliebe im Fliesstext verwendet werden.
- In verknapptem Text ist stets das Begriffszeichen «%» zu verwenden.
- Zwischen Zahl und Prozentzeichen ist ein Festabstand zu setzen.
- Beispiel: 56 Prozent der Stimmenden nahmen die Vorlage an. / Die
  Abschreibungen nahmen um 14 % zu, wogegen der Aufwand für die Sozialhilfe um 7
  % abnahm.

### Zusätzliche Punkte

- Denken, sprechen und schreiben Sie ganz selbstverständlich für alle
  Geschlechter.
- Berücksichtigen Sie alle Geschlechter bereits bei der Planung und Konzeption
  von Berichten, Referaten, Ausstellungen und Projekten.
- Beim Sprechen geht die Gleichstellung von Frau, Mann und nichtbinären Personen
  oft vergessen.
- Zitieren Sie Expertinnen und Experten. Berücksichtigen Sie bei der Bildauswahl
  oder bei Beispielen diverse Personen.`
  },
})
