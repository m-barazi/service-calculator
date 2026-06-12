# Angebote (Quotes/Packages) Feature Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Angebote" tab for creating, managing, and exporting quote packages with flexible pricing, discounts, and customer-facing vs. internal PDF views.

**Architecture:** New database tables (`quotes`, `quote_items`) with full CRUD API. New frontend route `/angebote` with list view, detail/edit view, and dual PDF export. Reuses existing patterns from categories and services CRUD.

**Tech Stack:** PostgreSQL, Express.js, React + TypeScript, jsPDF + jspdf-autotable

---

## 1. Data Model

### `quotes` table

```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  discount_type VARCHAR(10)
    CHECK (discount_type IS NULL OR discount_type IN ('percent', 'amount')),
  discount_value DECIMAL(10,4) DEFAULT 0,
  notes TEXT,
  valid_until DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
```

### `quote_items` table

```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  custom_name VARCHAR(255),
  custom_note TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,4) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id, sort_order);
```

**Key design decisions:**

- `service_id` is nullable — when NULL, the item is a freetext position using `custom_name` and `custom_note`
- `unit_price` is always stored — if linked to a service, it defaults from `service.salePrice` but can be overridden per-quote
- `ON DELETE CASCADE` on quote_items → deleting a quote removes all its items
- `ON DELETE SET NULL` on service_id → if a service is deleted, the quote item keeps its data via custom_name

### TypeScript Types

```typescript
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'
export type DiscountType = 'percent' | 'amount'

export interface Quote {
  id: string
  title: string
  customerName?: string
  status: QuoteStatus
  discountType?: DiscountType
  discountValue: number
  notes?: string
  validUntil?: string  // ISO date
  createdAt: string
  updatedAt: string
}

export interface QuoteItem {
  id: string
  quoteId: string
  serviceId?: string       // null for freetext items
  customName?: string       // used when serviceId is null
  customNote?: string
  quantity: number
  unitPrice: number          // always stored, can differ from service.salePrice
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Computed (not stored)
export interface QuoteTotals {
  subtotalNet: number
  discountAmount: number
  totalNet: number
  vatAmount: number
  totalGross: number
  items: QuoteLineComputation[]
}

export interface QuoteLineComputation {
  item: QuoteItem
  service?: Service        // resolved when serviceId is set
  lineNet: number
  lineGross: number
}
```

---

## 2. Backend API

### Quote endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quotes` | List all quotes, ordered by created_at DESC |
| GET | `/api/quotes/:id` | Get quote with items |
| POST | `/api/quotes` | Create quote (with optional items) |
| PUT | `/api/quotes/:id` | Update quote metadata (title, status, discount, etc.) |
| DELETE | `/api/quotes/:id` | Delete quote + cascade items |

### Quote item endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/quotes/:id/items` | Add item to quote |
| PUT | `/api/quotes/:id/items/:itemId` | Update item (quantity, unitPrice, custom_name, etc.) |
| DELETE | `/api/quotes/:id/items/:itemId` | Remove item from quote |
| PATCH | `/api/quotes/:id/items/reorder` | Reorder items (array of item IDs) |

### Response format for GET /api/quotes/:id

```json
{
  "id": "...",
  "title": "Website-Paket Premium",
  "customerName": "Max Mustermann",
  "status": "draft",
  "discountType": "percent",
  "discountValue": 10,
  "notes": "...",
  "validUntil": "2026-07-01",
  "items": [
    {
      "id": "...",
      "quoteId": "...",
      "serviceId": "...",
      "customName": null,
      "customNote": null,
      "quantity": 1,
      "unitPrice": 252.0,
      "sortOrder": 0,
      "service": { "id": "...", "name": "Website Design", ... }
    },
    {
      "id": "...",
      "quoteId": "...",
      "serviceId": null,
      "customName": "Individuelle Beratung",
      "customNote": "Vor Ort",
      "quantity": 3,
      "unitPrice": 50.0,
      "sortOrder": 1,
      "service": null
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

For the list endpoint (`GET /api/quotes`), items are NOT included — only quote metadata. The frontend fetches items on demand when viewing a quote.

---

## 3. Frontend — Angebote Page

### Route: `/angebote`

New tab in Layout sidebar and mobile bottom nav (now 5 items: Rechner, Angebote, Kategorien, Preisliste, Einstellungen).

### List View (default)

- Cards/table showing all quotes sorted by date (newest first)
- Each card shows: title, customer name, status badge, total (gross), date
- Status badges with colors: Draft (gray), Sent (blue), Accepted (green), Rejected (red)
- Click to open detail/edit view
- "Neues Angebot" button at top

### Detail/Edit View

Two-panel layout (similar to DetailsModal but full page):

**Left panel — Positionen:**
- List of quote items (sortable via drag or up/down buttons)
- Each item shows: name (from service or custom), quantity, unit price (editable), line total
- "Position hinzufügen" button opens a dropdown/modal to:
  - Select from existing services (searchable)
  - Or add freetext position (custom name + price)
- Inline editing: quantity, unit price, custom name for freetext items
- Delete item button on each row

**Right panel — Angebot-Details:**
- Title (editable)
- Customer name (editable)
- Status dropdown (Draft/Sent/Accepted/Rejected)
- Valid until date picker
- Discount section: toggle type (percent/amount/none), value input
- Notes textarea (internal notes, not shown in customer PDF)
- Computed totals display:
  - Zwischensumme (Netto)
  - Rabatt (calculated amount)
  - Gesamt (Netto)
  - MwSt
  - Gesamt (Brutto)

**Footer actions:**
- "Speichern" (auto-saves on changes, or explicit save button)
- "PDF Kunden-Version" — customer-facing PDF
- "PDF Intern" — internal PDF with cost/margin details
- "Löschen" (with confirmation)

---

## 4. Discount Logic

```
subtotalNet = sum of (quantity × unitPrice) for all items

if discountType === 'percent':
  discountAmount = subtotalNet × (discountValue / 100)
if discountType === 'amount':
  discountAmount = discountValue
if discountType === null:
  discountAmount = 0

totalNet = subtotalNet - discountAmount
vatAmount = totalNet × vatRate
totalGross = totalNet + vatAmount
```

Discount is always applied to the net amount, before VAT.

---

## 5. PDF Export — Two Modes

### Customer PDF (Kunden-Version)

Same visual structure as the existing Kostenvoranschlag PDF, but:

- **Table columns**: Position, Menge, Einzelpreis, Gesamtpreis (Netto), Gesamtpreis (Brutto)
- Individual line items are shown with their name and quantity
- **No purchase price, no margin, no cost information**
- Discount line shown if applicable: "Rabatt (-10%): -XX,XX €" or "Rabatt: -XX,XX €"
- Totals box: Zwischensumme (Netto), Rabatt, MwSt, Gesamt (Brutto)
- Title: uses the quote title
- Filename: `{title}_{date}_Angebot.pdf`

### Internal PDF (Intern)

Same as the existing Kostenvoranschlag PDF, extended with:

- **All line items with purchase price, sale price, margin** (same as current calculator PDF)
- Discount line shown
- Totals box includes: Kosten (Netto/Brutto), Gewinn, Marge %
- Notes section shows internal notes
- Title: uses the quote title with "(INTERN)" suffix
- Filename: `{title}_{date}_Intern.pdf`

---

## 6. Status Workflow

Statuses are set manually via dropdown. No automatic transitions.

| Status | Color | Description |
|--------|-------|-------------|
| draft | Gray | In Bearbeitung |
| sent | Blue | Gesendet |
| accepted | Green | Angenommen |
| rejected | Red | Abgelehnt |

Status is purely informational — it does not lock editing or restrict actions. The user can change status at any time.

---

## 7. Navigation Changes

- **Layout.tsx**: Add 5th nav item "Angebote" with `FileText` icon, route `/angebote`
- **Mobile nav**: Change from `grid-cols-4` to `grid-cols-5`
- **App.tsx**: Add route `/angebote` → `AngebotePage`

---

## 8. Files to Create/Modify

### New files:
- `src/pages/AngebotePage.tsx` — List + detail view for quotes
- `src/components/QuoteDetail.tsx` — Detail/edit view component
- `src/components/QuoteFormModal.tsx` — Create/edit quote metadata modal
- `src/components/AddItemModal.tsx` — Modal for adding service or freetext items
- `src/lib/quoteCalc.ts` — Computation logic for quote totals
- `src/lib/quotePdf.ts` — PDF generation for quotes (customer + internal)

### Modified files:
- `db/init.sql` — Add quotes and quote_items tables
- `backend/src/index.js` — Add quote + quote_items CRUD endpoints
- `src/types.ts` — Add Quote, QuoteItem, QuoteStatus, DiscountType types
- `src/lib/api.ts` — Add quote API functions
- `src/hooks/useApp.tsx` — Add quotes state and CRUD operations
- `src/components/Layout.tsx` — Add Angebote nav item (5 items)
- `src/App.tsx` — Add /angebote route

---

## 9. Verification

1. Create a new quote with title and customer name
2. Add service items from the price list → verify unit price defaults from service.salePrice
3. Add a freetext item with custom name and price
4. Change quantity and unit price on items → verify totals update
5. Apply a 10% discount → verify discount amount calculation
6. Apply a fixed €50 discount → verify discount amount
7. Export customer PDF → verify only names, quantities, and totals shown (no cost/margin)
8. Export internal PDF → verify all prices, costs, margins shown
9. Change quote status from Draft to Sent → verify badge color updates
10. Delete a quote → verify items are also removed
11. Verify mobile layout with 5 nav items works correctly