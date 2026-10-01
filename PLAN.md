# UI/UX-Plan: Individuelle Preise ohne Preislisten-Änderung

## Ausgangslage
- Die Preisliste (`services`) ist die zentrale Wahrheit für Einkaufs- und Verkaufspreise.
- Im Rechner und in Angeboten sollen Preise pro Position individuell überschrieben werden können, ohne die Preisliste zu verändern.
- Aktuell speichert der Warenkorb nur `quantity` und `note`. Angebote speichern zwar `unitPrice` pro Item, aber es gibt keine UI, diesen zu bearbeiten, außer dem `onBlur` in `ItemRow`.

## Ziel
Überall dort, wo ein Preis angezeigt wird, soll er mit einem einzigen Klick direkt editierbar sein – aber nur lokal für diese Position / diesen Warenkorb-Eintrag.

---

## 1. Rechner-Seite

### 1.1 Warenkorb-Eintrag erweitern
Aktuell: `Record<serviceId, { quantity, note }>`

Neu: `Record<serviceId, { quantity, note, unitPrice?, purchasePrice? }>`

- `unitPrice`: optionaler Override des Verkaufspreises
- `purchasePrice`: optionaler Override des Einkaufspreises (sollte aber selten nötig sein; primär geht es um VK)

### 1.2 UI in der ServiceRow
- **Verkaufspreis pro Stück** wird zu einem Inline-Edit-Feld.
- Standardwert = `service.salePrice`.
- Wenn der Wert vom Standard abweicht, wird er visuell markiert (z. B. kleiner Punkt, andere Farbe oder „bearbeitet“-Badge).
- Bei leerem / ungültigem Wert fällt das Feld zurück auf `service.salePrice`.

### 1.3 UI im ProductDetailsModal
- Bereich „Preise pro Stück“ wird editierbar.
- „Verkauf (netto)“ als Input.
- Optional: „Einkauf (netto)“ als Input für interne Kalkulation.
- Indikator, ob der Preis vom Preislisten-Wert abweicht.
- Button „Auf Preislistenpreis zurücksetzen“.

### 1.4 Berechnung
`computeLine` bevorzugt den override:
```ts
const salePrice = entry.unitPrice ?? service.salePrice
const costPrice = entry.purchasePrice ?? service.purchasePrice
```

### 1.5 Angebotserstellung aus Warenkorb
`buildCartQuoteItems` muss den `unitPrice`-Override mitgeben. Das tut es aktuell schon durch `service.salePrice`, muss nur den override verwenden.

---

## 2. Angebotsseite

### 2.1 Datenmodell
`QuoteItem` hat bereits `unitPrice`. Das reicht für den Verkaufspreis.
Für interne Gewinnberechnung im PDF brauchen wir zusätzlich `purchasePrice` auf `QuoteItem`, damit der Einkaufspreis pro Position gespeichert werden kann.

Vorschlag: `QuoteItem` erweitern um `purchasePrice?: number`.

### 2.2 UI in `ItemRow`
- „Preis“-Input ist bereits editierbar via `onBlurPrice`.
- Wir ergänzen:
  - ein kleines „Preis bearbeiten“-Icon oder das Preisfeld ist permanent editierbar
  - visuelle Markierung, wenn Preis vom Service abweicht
  - Tooltip / Hinweis: „Preislistenpreis: 100,00 €“

### 2.3 UI in `QuoteDetail` / neues Modal
- Beim Klick auf eine Position öffnet sich ein „Positionsdetails“-Modal (analog zum ProductDetailsModal im Rechner).
- Dort kann man:
  - Bezeichnung (falls Freitext) bearbeiten
  - Notiz bearbeiten
  - Menge ändern
  - **Verkaufspreis (netto)** bearbeiten
  - **Einkaufspreis (netto)** bearbeiten (intern)
  - Auf Preislistenwert zurücksetzen

### 2.4 Backend
- `quote_items` hat `unit_price`.
- Migration: `purchase_price NUMERIC` hinzufügen.
- `POST /api/quotes/:id/items` und `PUT /api/quotes/:id/items/:itemId` akzeptieren `purchasePrice`.
- Bei Service-Items wird initial der Service-EK als `purchasePrice` gespeichert.

---

## 3. PDF-Anpassungen

### 3.1 Rechner-PDF (`pdf.ts`)
- Tabellenzeile verwendet den override-Preis statt `service.salePrice`.
- Interner Modus: EK, VK, Marge pro Zeile basierend auf den override-Werten.

### 3.2 Angebots-PDF (`quotePdf.ts`)
- Kunden-PDF zeigt `item.unitPrice`.
- Internes PDF zeigt zusätzlich `item.purchasePrice` und berechnet Marge pro Zeile.
- Gesamtkosten/Gewinn intern basieren auf `purchasePrice` der Items.

---

## 4. UI/UX-Details

### 4.1 Inline-Preis-Input
- German number format (Komma als Dezimal).
- `inputMode="decimal"`.
- On blur: validieren und speichern.
- Wenn Preis gleich Standard: Markierung entfernen.
- Wenn Preis abweicht: kleiner Indikator z. B. `*`, goldener Punkt, oder Textfarbe.

### 4.2 Reset-Mechanismus
- „Zurücksetzen“ neben dem Preisfeld oder im Modal.
- Löscht den override und greift wieder auf `service.salePrice` zurück.

### 4.3 Mobile
- Inline-Preis-Input muss auf Touch funktionieren (nicht zu klein).
- Modal bietet mehr Platz und ist daher auf Mobile die bessere Eingabemethode.

### 4.4 Wiedererkennbarkeit
- Preisänderungen sollen sofort in Summe und Gewinn sichtbar sein (Live-Berechnung).
- Kein zusätzlicher „Speichern“-Button nötig; bei Angeboten wie bisher onBlur / API-Update.

---

## 5. Architektur / Datenfluss

```
Rechner:
service.salePrice ─┬─► cart[serviceId].unitPrice (override)
                   └─► ProductDetailsModal / ServiceRow Input
                          │
                          ▼
                  computeLine(entry.unitPrice ?? service.salePrice)
                          │
                          ▼
                  buildCartQuoteItems(unitPrice: override)
                          │
                          ▼
                  POST /api/quotes/:id/items { serviceId, unitPrice, ... }

Angebot:
QuoteItem.unitPrice ─┬─► ItemRow / Positionsdetails Input
                     └─► PUT /api/quotes/:id/items/:id { unitPrice }
                          │
                          ▼
                  computeQuoteTotals(line.item.unitPrice)
                          │
                          ▼
                  PDF (Kunden / Intern)
```

---

## 6. Empfohlene Implementierungsreihenfolge

1. **Warenkorb-Entry erweitern** (`types.ts`, `storage.ts`, `calc.ts`)
2. **ServiceRow inline Preis editierbar** machen
3. **ProductDetailsModal** Preis-Inputs geben
4. **buildCartQuoteItems** override-Preis verwenden
5. **Angebot: `QuoteItem` um `purchasePrice` erweitern**
6. **Backend Migration + API Anpassung**
7. **ItemRow / neues Positionsdetails-Modal** mit Preis-Inputs
8. **PDFs** auf override-Preise umstellen

---

## 7. Offene UX-Entscheidungen (brauchen dein Feedback)

- Soll der Einkaufspreis auch im Rechner / Angebot überschreibbar sein, oder nur der Verkaufspreis?
- Soll eine abweichende Preisänderung farblich markiert werden? Wenn ja, wie?
- Soll es pro Position eine „Preisvorschlag“-Funktion geben (z. B. +10% / -10% schnell anwenden)?
- Soll der Preis im Rechner direkt in der ServiceRow editierbar sein, oder nur im Modal?
