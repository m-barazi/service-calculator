# UI/UX-Optimierungen — Stand & Offene Punkte

> Letzte Aktualisierung: siehe aktueller Git-Stand auf `main`.
> Dieses Dokument dient als Projekt-Notiz für den aktuellen UI/UX-Optimierungslauf.

---

## ✅ Umgesetzt (P1 & P2)

### 1. Kunden-Detailansicht mit 360°-Übersicht
- Klick auf Kunden-Card öffnet Detailansicht (`/kunden?id=...`).
- Tabs: Übersicht · Angebote · Projekte · Rechnungen · Notizen.
- Übersicht zeigt Kontaktdaten, Adresse, schnelle Aktionen (Angebot erstellen, E-Mail, Telefon).
- Verknüpfte Daten werden client-seitig aus dem bestehenden App-Kontext gefiltert.

**Dateien:** `src/pages/CustomersPage.tsx`, `src/components/CustomerDetail.tsx`.

---

### 2. Angebote-Liste: Betrag sichtbar + Inline-Status + URL-Filter
- Angebots-Cards zeigen `totalGross` prominent.
- Status-Chip ist ein Inline-Dropdown für schnelle Status-Änderungen.
- Suche + Status-Filter werden in URL-Query-Parametern persistiert (`?search=&status=accepted`).
- Backend-List-Query berechnet `subtotal_net`, `totalNet` und `totalGross` in Cent-Arithmetik.

**Dateien:** `src/pages/AngebotePage.tsx`, `src/components/quotes/QuoteList.tsx`, `backend/src/quotes/router.js`, `backend/src/transforms.js`, `src/types.ts`.

---

### 3. Rechnungen: Schnell-Status + Bezahlt-Datum + Fälligkeits-Indikator
- Rechnungsliste zeigt Inline-Status-Select auf jeder Card.
- Wechsel zu `paid` setzt automatisch `paidAt = heute`.
- Fälligkeits-Indikator zeigt „Überfällig“ bei `dueDate < heute`.
- Suche + Status-Filter werden in URL persistiert.

**Dateien:** `src/pages/InvoicesPage.tsx`, `backend/src/invoices.js`.

---

### 4. Preisliste: Mobile Filter scrollbar + Bulk-Auswahl
- Kategorie-Chips auf Mobile horizontal scrollbar (`scrollbar-hide`).
- Checkbox-Auswahl pro Leistung auf Desktop und Mobile.
- Bulk-Toolbar (sticky bottom): Sichtbar · Verstecken · Löschen · Auswahl aufheben.
- Suche hat Clear-Button.

**Dateien:** `src/pages/PriceListPage.tsx`.

---

### 5. Kategorien: Drag & Drop statt Pfeiltasten
- Desktop: Drag-Handle + `@dnd-kit/core` & `@dnd-kit/sortable` für Reihenfolge.
- Pfeiltasten bleiben als Alternative erhalten.
- Drag & Drop wird während aktiver Suche deaktiviert (nur gefilterte Liste).
- Suche hat Clear-Button.

**Dateien:** `src/pages/CategoriesPage.tsx`, `src/components/SortableCategoryRow.tsx`.

---

### 6. Projekte: Finanz-Übersicht + Status-Quick-Change
- Neuer Backend-Endpunkt `GET /projects/:id/finances`.
  - Aggregiert Angebots-Bruttosumme aller Projekt-Angebote.
  - Summiert abgerechnete Bruttobeträge aus Rechnungen (exkl. `cancelled`).
  - Liefert `openAmount`, `quoteCount`.
- Projektdetail zeigt vier KPI-Karten.
- Status direkt im Detail-Header per Dropdown änderbar.
- Suche hat Clear-Button.

**Dateien:** `src/pages/ProjectsPage.tsx`, `backend/src/projects.js`, `src/lib/api.ts`, `src/hooks/useApp.tsx`.

---

### 7. Globale UX-Polish (Teilweise)
- **URL-Sync** für Suche/Filter auf Kunden, Projekte, Preisliste, Kategorien.
- **Suche-Clear-Button** auf allen genannten Seiten.
- Type-Check (`npm run lint`) und Tests (`npm run test`) bleiben grün.

---

## 🚧 Noch offen (P3 — niedrige Priorität)

| # | Thema | Details |
|---|---|---|
| 1 | Toast-Bestätigungen | Erfolgs-Toasts bei Bulk-Aktionen (z. B. „3 Leistungen sichtbar geschaltet“). |
| 2 | Loading-Skeletons | Statt großer Spinner-Blöcke: pulsierende Skeletons für Listen/Details. |
| 3 | Mobile Aktionen | Lösch-Buttons weniger prominent; ggf. „Mehr“-Menü oder Swipe-Actions. |
| 4 | Kategorie Mobile DnD | Mobile Variante der Drag-&-Drop-Sortierung (z. B. Touch-Handle mit haptischem Feedback). |
| 5 | Angebots-Bulk | Mehrfachauswahl und Bulk-Status-Change in der Angebotsliste. |
| 6 | Rechnungs-Bulk | Mehrfachauswahl und Bulk-Status-Change in der Rechnungsliste. |

---

## 📦 Neue Abhängigkeiten

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 🔌 Neue API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/projects/:id/finances` | Finanz-KPIs eines Projekts (Angebotssumme, Rechnungssumme, offener Betrag, Anzahl Angebote). |

---

## 🚀 Deployment-Notiz

Die App wird über GitHub Actions (`build-and-push.yml`) als Docker-Images zu `ghcr.io/m-barazi/service-calculator-*:latest` gebaut. Auf Hostinger läuft das Projekt als Docker-Compose-Stack `service-calculator`. Nach einem `git push` auf `main` muss auf dem VPS ein `docker compose pull && up -d` bzw. das Hostinger-MCP-Update `vps_docker_update` ausgeführt werden.
