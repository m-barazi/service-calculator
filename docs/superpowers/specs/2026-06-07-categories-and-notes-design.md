# Feature-Spec: Kategorien-Seite & Zeilen-Notizen

**Datum:** 2026-06-07
**Status:** Entwurf

## Übersicht

Zwei neue Features für den Service-Calculator:

1. **Kategorien-Seite** — Eigenständige Verwaltung von Service-Kategorien (CRUD, Sortierung, Icons, Farben)
2. **Zeilen-Notizen** — Pro-Service-Notizen im Kostenvoranschlag, bearbeitbar im Rechner und der Detail-Übersicht, sichtbar im PDF

**Reihenfolge:** Feature 1 (Kategorien) zuerst, da es ein DB-Schema-Change ist. Feature 2 (Notizen) danach, da es nur den Cart-State betrifft.

---

## Feature 1: Kategorien-Seite

### Datenbank-Schema

**Neue Tabelle `categories`:**

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(50),        -- Emoji oder Icon-Name, z.B. "🖨️"
  color       VARCHAR(7),         -- Hex-Farbe, z.B. "#10b981"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Änderung an `services`:**

```sql
-- Alt: category VARCHAR(100) NOT NULL
-- Neu:
ALTER TABLE services ADD COLUMN category_id UUID REFERENCES categories(id);
-- Nach Migration:
-- ALTER TABLE services DROP COLUMN category;
```

**Migration-Strategie:**

1. `categories`-Tabelle erstellen
2. 5 bestehende Kategorien einfügen: Print & Marketing, Web & Digital, Hosting & Domains, Kasse & Displays, Werbeartikel
3. `category_id`-Spalte zu `services` hinzufügen
4. Jeden Service: `category`-String → zugehörige `category_id` zuordnen
5. Alte `category`-Spalte entfernen
6. Seed-Daten in `init.sql` und `seedServices.ts` aktualisieren

**Vorgeschlagene Standard-Farben für die 5 Kategorien:**

| Kategorie | Icon | Farbe |
|-----------|------|-------|
| Print & Marketing | 🖨️ | #10b981 (emerald) |
| Web & Digital | 🌐 | #3b82f6 (blue) |
| Hosting & Domains | 🖥️ | #8b5cf6 (violet) |
| Kasse & Displays | 🏪 | #f59e0b (amber) |
| Werbeartikel | 🎁 | #ef4444 (red) |

### API-Endpunkte

**Neu — Kategorien:**

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET` | `/api/categories` | Alle Kategorien (sortiert nach `sort_order`) |
| `GET` | `/api/categories/:id` | Einzelne Kategorie |
| `POST` | `/api/categories` | Neue Kategorie erstellen |
| `PUT` | `/api/categories/:id` | Kategorie bearbeiten (nur angegebene Felder) |
| `DELETE` | `/api/categories/:id` | Kategorie löschen |

**Löschschutz:** `DELETE` gibt 409 Conflict zurück, wenn noch Services der Kategorie zugeordnet sind. Nutzer muss Services zuerst umordnen oder löschen.

**Änderung — Services:**

| Endpunkt | Änderung |
|----------|----------|
| `POST /api/services` | `category` → `category_id` (UUID) |
| `PUT /api/services/:id` | `category` → `category_id` (UUID) |
| `GET /api/services` | Antwort enthält `category_id` statt `category` |

**Seed-Endpunkt:** `POST /api/seed` erstellt auch die Standard-Kategorien (idempotent).

### Frontend

**Neue Route:** `/kategorien` — Sidebar-Reihenfolge: Rechner → Kategorien → Preisliste → Einstellungen

**Neue Komponente:** `CategoriesPage.tsx`

**Layout:** Ähnlich wie Preisliste-Seite. Jede Kategorie-Zeile zeigt:
- Icon (Emoji) + Name + Beschreibung (gekürzt)
- Farbvorschau (Punkt/Badge in Kategorie-Farbe)
- Sortier-Pfeile (▲▼) zum Verschieben
- Bearbeiten- und Löschen-Buttons

**Kategorie-Formular (Modal `CategoryFormModal.tsx`):**
- Name (Pflichtfeld)
- Beschreibung (optional)
- Icon/Emoji (optional, Freitext-Eingabe)
- Farbe (Farbwähler: vorgegebene Palette + Custom-Hex)
- Sichtbar-Checkbox (Standard: sichtbar)

**Änderung im Rechner (`CalculatorPage.tsx`):**
- Kategorie-Überschriften zeigen Icon + Name in der Kategorie-Farbe als Badge/Akzent
- Kategorien erscheinen in `sort_order`-Reihenfolge
- Nur sichtbare Kategorien werden angezeigt

**Änderung im Service-Formular (`ServiceFormModal.tsx`):**
- `category`-Freitextfeld → Dropdown mit Kategorien aus der API

**Neue Dateien:**
- `src/pages/CategoriesPage.tsx`
- `src/components/CategoryFormModal.tsx`
- `src/components/CategoryRow.tsx` (optional, kann auch inline)

**Geänderte Dateien:**
- `src/lib/api.ts` — Kategorie-API-Endpunkte + Service-API camelCase-Mapping anpassen
- `src/types.ts` — Category-Typ + Service-Typ anpassen
- `src/hooks/useApp.tsx` — Kategorie-State + CRUD-Operationen
- `src/components/Layout.tsx` — Neuer Sidebar-Eintrag
- `src/components/ServiceFormModal.tsx` — Kategorie-Dropdown
- `src/pages/CalculatorPage.tsx` — Kategorie-Farben/Icons/Sortierung
- `src/data/seedServices.ts` — Seed-Daten anpassen
- `backend/src/index.js` — Kategorie-Endpunkte + Service-Endpunkte anpassen
- `db/init.sql` — Schema + Seed-Daten aktualisieren

---

## Feature 2: Zeilen-Notizen im Kostenvoranschlag

### Cart-State

```typescript
// Aktuell:
type CartItem = { serviceId: string; quantity: number }

// Neu:
type CartItem = { serviceId: string; quantity: number; note: string }
```

Notizen werden nicht in der DB gespeichert. Sie sind Teil der Kalkulation und leben im `useApp`-Context + localStorage (`sc.cart.v1`).

### Rechner (`ServiceRow.tsx`)

- Notiz-Icon (📝) rechts neben der Menge
- Klick klappt ein Inline-Textfeld auf (einzeilig, max. ~100 Zeichen)
- Wenn Notiz existiert: Icon ausgefüllt/hervorgehoben
- Notiz-Feld startet immer leer

### Detail-Übersicht (`DetailsModal.tsx`)

- Notiz (falls vorhanden) wird unter dem Service-Namen angezeigt
- Bearbeitbar: Klick öffnet Textfeld zum Ändern
- Leeres Feld für neue Notizen

### PDF-Export (`pdf.ts`)

- Notiz erscheint als zweite Zeile direkt unter dem Service-Namen
- Kleinere Schrift, ggf. kursiv
- Keine Notiz → Zeile bleibt wie bisher

**Beispiel PDF-Tabelle:**
```
| Pos | Dienstleistung              | Menge | EK netto | VK netto |
|-----|----------------------------|-------|----------|----------|
| 1   | DE-Domain Service          |   1   |  8,00 €  | 15,00 €  |
|     | für mustermax.de           |       |          |          |
```

### Geänderte Dateien

- `src/types.ts` — CartItem um `note` erweitern
- `src/hooks/useApp.tsx` — Cart-Operationen anpassen (note mitspeichern)
- `src/components/ServiceRow.tsx` — Notiz-Icon + Inline-Textfeld
- `src/components/DetailsModal.tsx` — Notiz anzeigen + bearbeiten
- `src/lib/calc.ts` — CartItem-Typ anpassen (Berechnung bleibt gleich)
- `src/lib/pdf.ts` — Notiz in PDF-Tabelle rendern

---

## Fehlerbehandlung

- **Kategorie löschen mit zugeordneten Services:** API gibt 409 Conflict zurück. Frontend zeigt Fehlermeldung: "Diese Kategorie wird noch von X Services verwendet. Bitte ordne die Services einer anderen Kategorie zu, bevor du löschst."
- **Ungültige `category_id` beim Service erstellen:** API validiert, dass die Kategorie-ID existiert. Frontend zeigt Fehler im Formular.
- **Kategorie-Farbe Validierung:** Nur gültige Hex-Werte akzeptieren (`#` + 6 Hex-Zeichen). Ungültige Eingaben im Formular markieren.

## Offene Punkte

- Keine offenen Punkte. Alle Design-Entscheidungen wurden getroffen.