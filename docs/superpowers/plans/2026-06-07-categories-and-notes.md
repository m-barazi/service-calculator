# Kategorien-Seite & Zeilen-Notizen — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zwei neue Features für den Service-Calculator: (1) Kategorien-Seite mit CRUD, Sortierung, Icons und Farben, (2) Zeilen-Notizen im Kostenvoranschlag.

**Architecture:** Feature 1 (Kategorien) ändert das DB-Schema (`services.category` → `services.category_id`), fügt eine neue Tabelle `categories` hinzu, und erfordert Backend + Frontend + Migration. Feature 2 (Notizen) ist rein im Frontend — erweitert den Cart-State um ein `note`-Feld pro Position und rendert es im Rechner, Detail-Übersicht und PDF.

**Tech Stack:** React 18 + TypeScript, Express.js backend, PostgreSQL, Tailwind CSS, jsPDF

---

## Feature 1: Kategorien-Seite

### Task 1: DB-Schema — categories-Tabelle und Migration

**Files:**
- Modify: `db/init.sql`

- [ ] **Step 1: Füge die categories-Tabelle und Migration hinzu**

Füge in `db/init.sql` nach der bestehenden `services`-Tabelle die neue Tabelle und die Migration hinzu. Die Datei wird komplett neu geschrieben:

```sql
-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Services table (updated: category_id replaces category)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  purchase_price DECIMAL(10, 4) NOT NULL,
  sale_price DECIMAL(10, 4) NOT NULL,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  url TEXT,
  note TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_visible ON services(visible);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

-- Seed categories
INSERT INTO categories (name, description, icon, color, sort_order, visible) VALUES
  ('Print & Marketing', 'Druck- und Marketingdienstleistungen', '🖨️', '#10b981', 1, true),
  ('Web & Digital', 'Website, Logo und digitale Dienste', '🌐', '#3b82f6', 2, true),
  ('Hosting & Domains', 'Hosting, Domains und E-Mail', '🖥️', '#8b5cf6', 3, true),
  ('Kasse & Displays', 'POS-Displays und Kassensysteme', '🏪', '#f59e0b', 4, true),
  ('Werbeartikel', 'Promotion- und Werbeartikel', '🎁', '#ef4444', 5, true)
ON CONFLICT DO NOTHING;

-- Seed services (now referencing category_id via category name lookup)
INSERT INTO services (name, category_id, purchase_price, sale_price, default_quantity, url, note, visible)
SELECT 'Stempel', c.id, 9.24, 21.64, 1, 'https://www.vistaprint.de/einladungen-und-schreibwaren/personalisierte-stempel/selbstfaerbende-stempel', 'Selbstfärbender Stempel', true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
SELECT 'Visitenkarten (abgerundet)', c.id, 0.08, 71.01, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', 'Abgerundete Ecken, Standardpapier', true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
SELECT 'Visitenkarten Standard', c.id, 0.07, 16.81, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', NULL, true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
SELECT 'Flyer ohne Falz (A5)', c.id, 0.08, 51.01, 250, 'https://www.vistaprint.de/marketingmaterial/flyer', 'Format A5', true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
SELECT 'Kugelschreiber Premium', c.id, 66.81, 3355.34, 50, 'https://www.vistaprint.de/werbeartikel/schreib-buerobedarf/personalisierte-kugelschreiber/premium-kugelschreiber', NULL, true FROM categories c WHERE c.name = 'Werbeartikel'
UNION ALL
SELECT 'Jahresplaner 2026', c.id, 42.02, 225.08, 5, 'https://www.vistaprint.de/fotogeschenke/fotokalender/jahresplaner-2026', NULL, true FROM categories c WHERE c.name = 'Werbeartikel'
UNION ALL
SELECT 'Dreieck-Pappaufsteller', c.id, 52.10, 82.10, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/dreieck-pappaufsteller', '50×50×185 cm', true FROM categories c WHERE c.name = 'Kasse & Displays'
UNION ALL
SELECT 'Bodenaufsteller (vierseitig)', c.id, 68.91, 118.91, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/bodenaufsteller-vierseitig', '33×33×200 cm', true FROM categories c WHERE c.name = 'Kasse & Displays'
UNION ALL
SELECT 'Website Design', c.id, 0, 252.0, 1, NULL, 'Komplette Website inkl. Design', true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
SELECT 'Website Anpassung', c.id, 0, 50.0, 3, NULL, 'Stundenbasis pro Anpassung', true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
SELECT 'Logo Design', c.id, 0, 50.0, 1, NULL, NULL, true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
SELECT 'Social Media Post', c.id, 0, 60.0, 4, NULL, 'Pro Post inkl. Grafik', true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
SELECT 'DE-Domain', c.id, 12.61, 12.61, 1, NULL, '.de Domain pro Jahr', true FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
SELECT 'COM-Domain', c.id, 13.45, 5.0, 1, NULL, '.com Domain pro Jahr', false FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
SELECT 'Hosting', c.id, 8.40, 8.40, 1, NULL, 'Standard Webhosting', true FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
SELECT 'Starter Business Email 10GB', c.id, 19.33, 39.33, 1, NULL, 'Pro Postfach / Jahr', true FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
SELECT 'Google Workspace (Starter)', c.id, 72.27, 104.03, 1, NULL, 'Pro User / Jahr', true FROM categories c WHERE c.name = 'Hosting & Domains';
```

- [ ] **Step 2: Commit**

```bash
git add db/init.sql
git commit -m "feat: categories table + services.category_id migration in init.sql"
```

---

### Task 2: Backend — Kategorie-API-Endpunkte

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Füge die Kategorie-API-Endpunkte hinzu**

Füge in `backend/src/index.js` nach den Service-Endpunkten die Kategorie-Endpunkte hinzu. Ändere auch die Service-Endpunkte, damit sie `category_id` statt `category` verwenden.

Neue Hilfsfunktion `toCamelCategory`:
```javascript
function toCamelCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    visible: row.visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

Neue Endpunkte (nach den Service-Routen):
```javascript
// ===== Categories =====

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json(result.rows.map(toCamelCategory));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(toCamelCategory(result.rows[0]));
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, icon, color, sortOrder, visible } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (name, description, icon, color, sort_order, visible, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [name, description || null, icon || null, color || null, sortOrder || 0, visible !== false]
    );
    res.status(201).json(toCamelCategory(result.rows[0]));
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, sortOrder, visible } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
    if (icon !== undefined) { sets.push(`icon = $${idx++}`); vals.push(icon); }
    if (color !== undefined) { sets.push(`color = $${idx++}`); vals.push(color); }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(sortOrder); }
    if (visible !== undefined) { sets.push(`visible = $${idx++}`); vals.push(visible); }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE categories SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(toCamelCategory(result.rows[0]));
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if any services reference this category
    const serviceCount = await pool.query('SELECT COUNT(*) FROM services WHERE category_id = $1', [id]);
    if (parseInt(serviceCount.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Category has associated services',
        serviceCount: parseInt(serviceCount.rows[0].count),
      });
    }
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
```

- [ ] **Step 2: Ändere die Service-Endpunkte für category_id**

Aktualisiere die `toCamel`-Funktion für Services: Ersetze `category: row.category` durch `categoryId: row.category_id`.

Aktualisiere `POST /api/services`: Ersetze `category` durch `categoryId` → `category_id` im Query.

Aktualisiere `PUT /api/services/:id`: Ersetze `category` durch `categoryId` → `category_id` im dynamischen Update.

Aktualisiere `GET /api/services`: Ändere die ORDER BY-Klausel von `ORDER BY category, name` zu `ORDER BY category_id, name`.

Aktualisiere den Seed-Endpunkt `POST /api/seed`: Ersetze `category` durch `categoryId` → `category_id` im INSERT, und füge Kategorie-Seeding hinzu.

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: category API endpoints + service endpoints use category_id"
```

---

### Task 3: Frontend — Category-Typ und API-Client

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Füge den Category-Typ hinzu und aktualisiere Service**

In `src/types.ts`, füge den `Category`-Interface hinzu und ändere `Service.category` zu `Service.categoryId`:

```typescript
export interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  sortOrder: number
  visible: boolean
  createdAt: number | string
  updatedAt: number | string
}

export interface Service {
  id: string
  name: string
  categoryId: string  // war: category: string
  purchasePrice: number
  salePrice: number
  defaultQuantity: number
  url?: string
  note?: string
  visible: boolean
  createdAt: number | string
  updatedAt: number | string
}
```

- [ ] **Step 2: Aktualisiere den API-Client**

In `src/lib/api.ts`, füge Kategorie-API-Funktionen hinzu und aktualisiere den Service-Mapping:

Ersetze in `toCamel`: `category: row.category` → `categoryId: row.category_id`

Füge neue Funktionen hinzu:

```typescript
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  const data = await res.json()
  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    visible: row.visible,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }))
}

export async function createCategory(cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const res = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cat),
  })
  if (!res.ok) throw new Error('Failed to create category')
  const data = await res.json()
  return data
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to update category')
  const data = await res.json()
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' })
  if (res.status === 409) {
    const data = await res.json()
    throw new Error(data.error || 'Category has associated services')
  }
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete category')
}
```

Aktualisiere `createService` und `updateService`: Der Body sendet jetzt `categoryId` statt `category`.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/lib/api.ts
git commit -m "feat: Category type + API client for categories, Service uses categoryId"
```

---

### Task 4: Frontend — useApp-Hook erweitern

**Files:**
- Modify: `src/hooks/useApp.tsx`

- [ ] **Step 1: Füge Kategorie-State und CRUD-Operationen hinzu**

Erweitere den `AppState`-Interface um:
```typescript
// Categories
categories: Category[]
isLoadingCategories: boolean
addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
updateCategory: (id: string, patch: Partial<Category>) => Promise<void>
deleteCategory: (id: string) => Promise<void>
refreshCategories: () => Promise<void>
```

Füge im `AppProvider` hinzu:
```typescript
const [categories, setCategories] = useState<Category[]>([])
const [isLoadingCategories, setIsLoadingCategories] = useState(true)
```

Lade Kategorien on mount (neben Services):
```typescript
useEffect(() => {
  const load = async () => {
    try {
      const [servicesData, categoriesData] = await Promise.all([
        fetchServices(),
        fetchCategories(),
      ])
      setServices(servicesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingCategories(false)
    }
  }
  load()
}, [])
```

Füge CRUD-Operationen hinzu (analog zu Services): `addCategory`, `updateCategory`, `deleteCategory`, `refreshCategories`.

Ersetze die abgeleitete `categories` (derzeit `Set<string>`) durch den State `categories: Category[]`.

Entferne die alte `categories: string[]` aus dem `AppState` und ersetze sie mit dem neuen `categories: Category[]`.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useApp.tsx
git commit -m "feat: category state + CRUD in useApp, categories loaded from API"
```

---

### Task 5: Frontend — Kategorien-Seite und Formular

**Files:**
- Create: `src/pages/CategoriesPage.tsx`
- Create: `src/components/CategoryFormModal.tsx`

- [ ] **Step 1: Erstelle CategoryFormModal.tsx**

Erstelle `src/components/CategoryFormModal.tsx` — ein Modal zum Erstellen/Bearbeiten von Kategorien. Folgt dem Muster von `ServiceFormModal.tsx`:

- Felder: Name (Pflicht), Beschreibung (optional), Icon/Emoji (optional, Freitext), Farbe (optional, Hex-Eingabe mit Farb-Vorschau), Sichtbar-Checkbox
- Farb-Eingabe: Ein `<input type="color">` für die Farb-Auswahl, oder ein Text-Feld mit Hex-Validierung
- Validierung: Name darf nicht leer sein, Farbe muss gültiges Hex sein (`#` + 6 Hex-Zeichen)
- Props: `open`, `onClose`, `category?: Category` (für Bearbeitung)
- Verwendet `useApp` für `addCategory` und `updateCategory`

- [ ] **Step 2: Erstelle CategoriesPage.tsx**

Erstelle `src/pages/CategoriesPage.tsx` — Kategorien-Verwaltungsseite, ähnlich wie `PriceListPage.tsx`:

- Header mit Titel "Kategorien" und Button "Neue Kategorie"
- Stat-Karten: Anzahl Kategorien, Anzahl sichtbar
- Liste der Kategorien, jede Zeile zeigt:
  - Icon (Emoji) + Name + Beschreibung (gekürzt)
  - Farbvorschau (kleiner Punkt in der Kategorie-Farbe)
  - Sortier-Pfeile ▲▼ (ändert `sortOrder` via `updateCategory`)
  - Sichtbar/Versteckt-Toggle
  - Bearbeiten- und Löschen-Buttons
- Bestätigungsdialog für Löschen (mit Fehlerbehandlung für 409 Conflict)
- Suchfeld zum Filtern nach Name/Beschreibung

- [ ] **Step 3: Commit**

```bash
git add src/pages/CategoriesPage.tsx src/components/CategoryFormModal.tsx
git commit -m "feat: CategoriesPage + CategoryFormModal components"
```

---

### Task 6: Frontend — Route, Sidebar und bestehende Komponenten anpassen

**Files:**
- Modify: `src/App.tsx` — Neue Route `/kategorien`
- Modify: `src/components/Layout.tsx` — Sidebar-Eintrag hinzufügen
- Modify: `src/components/ServiceFormModal.tsx` — Kategorie-Dropdown statt Freitext
- Modify: `src/pages/CalculatorPage.tsx` — Kategorie-Farben/Icons/Sortierung
- Modify: `src/pages/PriceListPage.tsx` — `category` → `categoryId` + Kategorie-Namen auflösen

- [ ] **Step 1: App.tsx — Route hinzufügen**

Füge in `src/App.tsx` den Import und die Route hinzu:
```typescript
import { CategoriesPage } from './pages/CategoriesPage'
// ...
<Route path="kategorien" element={<CategoriesPage />} />
```

- [ ] **Step 2: Layout.tsx — Sidebar-Eintrag**

Füge in `src/components/Layout.tsx` einen neuen NAV-Eintrag hinzu. Importiere `Tags` (oder `FolderOpen`) von lucide-react:
```typescript
import { Calculator, Receipt, Tags, Settings as SettingsIcon, Sun, Moon, Monitor } from 'lucide-react'

const NAV = [
  { to: '/', icon: Calculator, label: 'Rechner', end: true },
  { to: '/kategorien', icon: Tags, label: 'Kategorien' },
  { to: '/preisliste', icon: Receipt, label: 'Preisliste' },
  { to: '/einstellungen', icon: SettingsIcon, label: 'Einstellungen' },
]
```

Ändere auch die mobile Bottom-Navigation von `grid-cols-3` zu `grid-cols-4`.

- [ ] **Step 3: ServiceFormModal.tsx — Kategorie-Dropdown**

Ersetze das Freitext-Input für `category` durch ein `<select>`-Dropdown, das die Kategorien aus `useApp` lädt. Zeige den Kategorie-Namen an, sende aber die `categoryId`.

```typescript
const { addService, updateService, categories, settings } = useApp()
```

Ersetze im Formular-State `category: string` durch `categoryId: string`.

Ersetze das Input-Feld:
```tsx
<Field label="Kategorie" error={errors.categoryId}>
  <select
    value={form.categoryId}
    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
    className="input w-full"
  >
    <option value="">Kategorie wählen…</option>
    {categories.filter(c => c.visible).map(c => (
      <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
    ))}
  </select>
</Field>
```

- [ ] **Step 4: CalculatorPage.tsx — Kategorie-Farben/Icons/Sortierung**

Ändere die `categories`-Ableitung von `Set<string>` zu einer Liste von `Category`-Objekten. Nutze die `categories` aus `useApp` statt einer abgeleiteten Liste.

Ersetze:
```typescript
const categories = useMemo(() => {
  const map = new Map<string, number>()
  visibleServices.forEach((s) =>
    map.set(s.category, (map.get(s.category) ?? 0) + 1),
  )
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
}, [visibleServices])
```

Durch:
```typescript
const categoryMap = useMemo(() => {
  const map = new Map<string, number>()
  visibleServices.forEach((s) =>
    map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + 1),
  )
  return map
}, [visibleServices])

const displayCategories = useMemo(
  () =>
    allCategories
      .filter((c) => c.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        ...c,
        count: categoryMap.get(c.id) ?? 0,
      }))
      .filter((c) => c.count > 0),
  [allCategories, categoryMap],
)
```

Aktualisiere die CategoryChips, um Kategorie-Icons und -Farben anzuzeigen.

Ändere den Service-Filter von `s.category` zu `s.categoryId`.

Ändere die ServiceRow-Aufrufe, um Kategorie-Farben weiterzugeben (optional, kann später erfolgen).

- [ ] **Step 5: PriceListPage.tsx — category → categoryId**

In `src/pages/PriceListPage.tsx`: Ersetze alle `s.category`-Referenzen durch Kategorien-Auflösung über die `categories`-Liste aus `useApp`.

Ersetze:
```typescript
const categories = useMemo(() => {
  const map = new Map<string, number>()
  services.forEach((s) => map.set(s.category, (map.get(s.category) ?? 0) + 1))
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
}, [services])
```

Durch:
```typescript
const displayCategories = useMemo(() => {
  const map = new Map<string, number>()
  services.forEach((s) => map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + 1))
  return allCategories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ ...c, count: map.get(c.id) ?? 0 }))
}, [services, allCategories])
```

Ersetze `s.category` im Desktop-Table und Mobile-Cards durch Auflösung: `allCategories.find(c => c.id === s.categoryId)?.name ?? s.categoryId`

- [ ] **Step 6: ServiceRow.tsx — categoryId statt category**

In `src/components/ServiceRow.tsx`: Ersetze `<span className="badge-neutral">{service.category}</span>` durch die Kategorien-Auflösung. Übergebe `categories` als Prop oder löse den Namen im übergeordneten Component auf.

Die einfachste Lösung: Ein `categoryName`-Prop hinzufügen oder das Badge so belassen und den Namen im Parent auflösen.

Ändere in `ServiceRow`:
```typescript
interface ServiceRowProps {
  service: Service
  quantity: number
  onChangeQuantity: (q: number) => void
  showPrices: boolean
  categoryName?: string  // neu
  categoryColor?: string  // neu
  categoryIcon?: string   // neu
}
```

Ersetze `{service.category}` durch `{categoryIcon ? `${categoryIcon} ` : ''}{categoryName ?? service.categoryId}` und nutze `categoryColor` als Badge-Farbakzent, falls vorhanden.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx src/components/ServiceFormModal.tsx src/pages/CalculatorPage.tsx src/pages/PriceListPage.tsx src/components/ServiceRow.tsx
git commit -m "feat: category route, sidebar, dropdown, colors in calculator + price list"
```

---

### Task 7: Frontend — Seed-Daten und Storage anpassen

**Files:**
- Modify: `src/data/seedServices.ts`
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Aktualisiere seedServices.ts**

In `src/data/seedServices.ts`: Ändere alle `category`-Felder zu `categoryId` mit den UUIDs der Standard-Kategorien. Da die Seed-Daten nur als Fallback dienen (die API ist die primäre Quelle), aktualisiere die Seed-Daten auf das neue Format.

Die einfachste Lösung: Entferne die lokalen Seed-Daten für Services und verlasse dich auf die API. Alternativ: aktualisiere das Format.

Wenn beibehalten: Füge eine `seedCategories`-Konstante hinzu und ändere `seedServices` auf `categoryId`.

- [ ] **Step 2: Aktualisiere storage.ts**

In `src/lib/storage.ts`: Die Cart-Speicherung bleibt gleich (nur `Record<string, number>`). Die Service- und Settings-Speicherung ist bereits nur noch Fallback. Keine großen Änderungen nötig, aber entferne `loadServices`/`saveServices` als veraltete Funktionen, falls sie nicht mehr verwendet werden.

Prüfe, ob `loadServices` noch aufgerufen wird. Wenn nicht, entferne es.

- [ ] **Step 3: Commit**

```bash
git add src/data/seedServices.ts src/lib/storage.ts
git commit -m "feat: update seed data for categoryId, clean up storage"
```

---

### Task 8: Frontend — Kategorie-Farben im Rechner-UI

**Files:**
- Modify: `src/pages/CalculatorPage.tsx`
- Modify: `src/components/ServiceRow.tsx`
- Modify: `src/index.css` (falls nötig für Badge-Stile)

- [ ] **Step 1: Kategorie-Header mit Icon und Farbe im Rechner**

In `CalculatorPage.tsx`: Gruppiere die Services nach Kategorie und zeige einen Kategorie-Header vor jeder Gruppe:

```tsx
{displayCategories.map((cat) => {
  const catServices = filtered.filter((s) => s.categoryId === cat.id)
  if (catServices.length === 0) return null
  return (
    <div key={cat.id}>
      <div className="stagger-header flex items-center gap-2 py-2">
        {cat.icon && <span className="text-lg">{cat.icon}</span>}
        <h2 className="text-sm font-semibold text-ink">{cat.name}</h2>
        {cat.color && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: cat.color }}
          />
        )}
        <span className="text-2xs text-ink-muted">({catServices.length})</span>
      </div>
      {catServices.map((s) => (
        <ServiceRow
          key={s.id}
          service={s}
          quantity={cart[s.id] ?? 0}
          onChangeQuantity={(q) => setQuantity(s.id, q)}
          showPrices={showPrices}
          categoryName={cat.name}
          categoryColor={cat.color}
          categoryIcon={cat.icon}
        />
      ))}
    </div>
  )
})}
```

Entferne die Kategorie-Filter-Chips (werden durch die gruppierte Ansicht ersetzt) oder behalte sie als Filter bei, je nach UX-Präferenz. Da die Kategorien jetzt visuell gruppiert sind, können die Chips als Filter erhalten bleiben.

- [ ] **Step 2: Badge-Farbstil in ServiceRow**

In `ServiceRow.tsx`: Nutze `categoryColor` für den Badge-Hintergrund:

```tsx
<span
  className="badge-neutral"
  style={categoryColor ? { backgroundColor: categoryColor + '20', color: categoryColor, borderColor: categoryColor + '40' } : undefined}
>
  {categoryIcon ? `${categoryIcon} ` : ''}{categoryName}
</span>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/CalculatorPage.tsx src/components/ServiceRow.tsx
git commit -m "feat: category headers with icons and colors in calculator"
```

---

## Feature 2: Zeilen-Notizen im Kostenvoranschlag

### Task 9: Frontend — CartItem-Typ erweitern

**Files:**
- Modify: `src/types.ts`
- Modify: `src/hooks/useApp.tsx`
- Modify: `src/lib/calc.ts`
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Erweitere CartItem in types.ts**

```typescript
export interface CartItem {
  serviceId: string
  quantity: number
  note: string  // neu
}
```

- [ ] **Step 2: Aktualisiere useApp.tsx — Cart-State mit Notes**

Ändere den Cart-State von `Record<string, number>` zu `Record<string, { quantity: number; note: string }>`.

Aktualisiere `setQuantity`, sodass es die bestehende Note beibehält:
```typescript
const setQuantity = useCallback((serviceId: string, quantity: number) => {
  setCart((prev) => {
    const next = { ...prev }
    const q = Math.max(0, Math.floor(quantity))
    if (q <= 0) delete next[serviceId]
    else next[serviceId] = { quantity: q, note: prev[serviceId]?.note ?? '' }
    return next
  })
}, [])
```

Füge eine neue `setNote`-Funktion hinzu:
```typescript
const setNote = useCallback((serviceId: string, note: string) => {
  setCart((prev) => {
    const next = { ...prev }
    if (next[serviceId]) {
      next[serviceId] = { ...next[serviceId], note }
    }
    return next
  })
}, [])
```

Exponiere `setNote` im `AppState`.

Aktualisiere `cartItemCount` und `cartLineCount` um mit dem neuen Format zu arbeiten.

- [ ] **Step 3: Aktualisiere calc.ts**

In `src/lib/calc.ts`: Die `computeCart`-Funktion erwartet jetzt `CartItem[]` mit `note`-Feld. Die Berechnungslogik bleibt gleich, da `note` nicht in die Berechnung eingeht.

Keine Änderung nötig, da `note` ignoriert wird.

- [ ] **Step 4: Aktualisiere storage.ts — Cart-Format**

Ändere die Cart-Typ-Signatur in `storage.ts`:

```typescript
export function loadCart(): Record<string, { quantity: number; note: string }> {
  try {
    const raw = localStorage.getItem(KEYS.cart)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Migrate from old format (quantity-only) to new format
    const result: Record<string, { quantity: number; note: string }> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number') {
        // Old format: { serviceId: quantity }
        result[key] = { quantity: value, note: '' }
      } else if (typeof value === 'object' && value !== null) {
        // New format: { serviceId: { quantity, note } }
        result[key] = { quantity: (value as any).quantity ?? 0, note: (value as any).note ?? '' }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function saveCart(cart: Record<string, { quantity: number; note: string }>): void {
  try {
    localStorage.setItem(KEYS.cart, JSON.stringify(cart))
  } catch {
    /* no-op */
  }
}
```

Das ist wichtig für Abwärtskompatibilität — bestehende Carts im alten Format werden automatisch migriert.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/hooks/useApp.tsx src/lib/calc.ts src/lib/storage.ts
git commit -m "feat: extend CartItem with note field, migrate old cart format"
```

---

### Task 10: Frontend — Notiz-UI im Rechner (ServiceRow)

**Files:**
- Modify: `src/components/ServiceRow.tsx`

- [ ] **Step 1: Füge Notiz-Icon und Inline-Textfeld hinzu**

Füge in `ServiceRow.tsx` neue Props hinzu:
```typescript
interface ServiceRowProps {
  service: Service
  quantity: number
  onChangeQuantity: (q: number) => void
  showPrices: boolean
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  note?: string           // neu
  onChangeNote?: (note: string) => void  // neu
}
```

Füge einen Notiz-Bereich hinzu, der aufklappt:

```tsx
{/* Note toggle + inline field */}
<div className="flex items-center gap-2 mt-1">
  <button
    onClick={() => setShowNote(!showNote)}
    className={[
      'qty-btn text-ink-muted',
      note ? 'text-accent' : '',
    ].join(' ')}
    title="Notiz hinzufügen"
  >
    <StickyNote className="h-3.5 w-3.5" />
  </button>
  {showNote && (
    <input
      type="text"
      value={note ?? ''}
      onChange={(e) => onChangeNote?.(e.target.value)}
      placeholder="z.B. für mustermax.de"
      maxLength={100}
      className="input flex-1 text-sm"
    />
  )}
</div>
```

Importiere `StickyNote` von lucide-react.

Füge `const [showNote, setShowNote] = useState(false)` hinzu.

- [ ] **Step 2: Commit**

```bash
git add src/components/ServiceRow.tsx
git commit -m "feat: note icon and inline text field in ServiceRow"
```

---

### Task 11: Frontend — Notiz im DetailsModal und PDF

**Files:**
- Modify: `src/components/DetailsModal.tsx`
- Modify: `src/lib/pdf.ts`
- Modify: `src/pages/CalculatorPage.tsx`
- Modify: `src/types.ts` (LineComputation)

- [ ] **Step 1: Erweitere LineComputation um note**

In `src/types.ts`:
```typescript
export interface LineComputation {
  service: Service
  quantity: number
  note: string  // neu
  totalCostNet: number
  // ...rest bleibt gleich
}
```

- [ ] **Step 2: Aktualisiere calc.ts — note durchreichen**

In `src/lib/calc.ts`, `computeCart`: Übertrage die Note vom CartItem auf die LineComputation:

```typescript
lines.push({
  ...computeLine(svc, item.quantity, vatRate),
  note: item.note,
})
```

- [ ] **Step 3: Aktualisiere DetailsModal.tsx — Notiz bearbeitbar**

In der Positionen-Tabelle, zeige die Notiz unter dem Service-Namen an. Wenn eine Note existiert, zeige sie als bearbeitbaren Text an. Wenn nicht, zeige einen Platzhalter.

```tsx
<div className="col-span-2 sm:col-span-1">
  <p className="text-sm font-medium text-ink">
    {line.service.name}
  </p>
  <p className="text-2xs text-ink-muted">
    {line.service.categoryId /* resolve to name */}
  </p>
  {line.note && (
    <p className="mt-0.5 text-2xs italic text-ink-muted">
      {line.note}
    </p>
  )}
</div>
```

- [ ] **Step 4: Aktualisiere pdf.ts — Notiz in PDF-Tabelle**

In `src/lib/pdf.ts`, `generatePdfReport`: Ändere die Tabellenzeilen, um Notizen als zweite Zeile unter dem Service-Namen anzuzeigen.

Ersetze die `rows`-Zuweisung:
```javascript
const rows = totals.lines.map((l) => {
  const nameContent = l.note
    ? [{ content: l.service.name, styles: { fontStyle: 'bold' } }, { content: l.note, styles: { fontSize: 8, fontStyle: 'italic', textColor: INK_SOFT } }]
    : l.service.name
  return [
    nameContent,
    String(l.quantity),
    formatEUR(l.service.salePrice),
    formatEUR(l.totalSaleNet),
    formatEUR(l.totalSaleGross),
  ]
})
```

Hinweis: jsPDF-autotable unterstützt Multi-Content-Zellen. Die Notiz wird als zweite Zeile in der gleichen Zelle gerendert, kleiner und kursiv.

- [ ] **Step 5: Aktualisiere CalculatorPage.tsx — note props durchreichen**

In `CalculatorPage.tsx`: Übertrage die Note-Daten an ServiceRow und DetailsModal:

```tsx
<ServiceRow
  key={s.id}
  service={s}
  quantity={cart[s.id]?.quantity ?? 0}
  onChangeQuantity={(q) => setQuantity(s.id, q)}
  showPrices={showPrices}
  categoryName={cat.name}
  categoryColor={cat.color}
  categoryIcon={cat.icon}
  note={cart[s.id]?.note ?? ''}
  onChangeNote={(note) => setNote(s.id, note)}
/>
```

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/calc.ts src/components/DetailsModal.tsx src/lib/pdf.ts src/pages/CalculatorPage.tsx
git commit -m "feat: notes in DetailsModal and PDF export"
```

---

### Task 12: Frontend — Backend-Seed aktualisieren und Testen

**Files:**
- Modify: `backend/src/index.js` (Seed-Endpunkt)
- Modify: `src/data/seedServices.ts`

- [ ] **Step 1: Aktualisiere den Backend-Seed-Endpunkt**

In `backend/src/index.js`, aktualisiere `POST /api/seed`, um auch Kategorien zu seed:

```javascript
app.post('/api/seed', async (req, res) => {
  try {
    // Seed categories first
    const catCount = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCount.rows[0].count) === 0) {
      const categories = [
        ['Print & Marketing', 'Druck- und Marketingdienstleistungen', '🖨️', '#10b981', 1, true],
        ['Web & Digital', 'Website, Logo und digitale Dienste', '🌐', '#3b82f6', 2, true],
        ['Hosting & Domains', 'Hosting, Domains und E-Mail', '🖥️', '#8b5cf6', 3, true],
        ['Kasse & Displays', 'POS-Displays und Kassensysteme', '🏪', '#f59e0b', 4, true],
        ['Werbeartikel', 'Promotion- und Werbeartikel', '🎁', '#ef4444', 5, true],
      ];
      for (const [name, description, icon, color, sortOrder, visible] of categories) {
        await pool.query(
          `INSERT INTO categories (name, description, icon, color, sort_order, visible, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [name, description, icon, color, sortOrder, visible]
        );
      }
    }

    // Seed services (existing logic, but with category_id)
    const count = await pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(count.rows[0].count) > 0) {
      return res.json({ message: 'Database already has services, skipping seed', count: parseInt(count.rows[0].count) });
    }

    // ... rest of seed with category_id references
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});
```

- [ ] **Step 2: Teste die App manuell**

Starte die App mit `docker compose up --build` und teste:
1. Kategorien-Seite: Erstellen, Bearbeiten, Sortieren, Löschen einer Kategorie
2. Rechner: Kategorie-Header mit Icon und Farbe, Service-Zeilen mit Kategorie-Badge
3. Preisliste: Kategorie-Dropdown im Service-Formular
4. Notizen: Notiz im Rechner eingeben, in Detail-Übersicht sehen, im PDF exportieren
5. Löschen einer Kategorie mit zugeordneten Services: 409-Fehler

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.js src/data/seedServices.ts
git commit -m "feat: update seed endpoint for categories, final cleanup"
```

---

## Scope-Check: Spec-Abdeckung

| Spec-Anforderung | Task |
|---|---|
| categories DB-Tabelle | Task 1 |
| services.category_id Migration | Task 1 |
| Kategorie-API-Endpunkte (CRUD) | Task 2 |
| Service-API category_id | Task 2 |
| Löschschutz (409) | Task 2 |
| Category-Typ + API-Client | Task 3 |
| useApp Kategorie-State | Task 4 |
| CategoriesPage + CategoryFormModal | Task 5 |
| Route + Sidebar | Task 6 |
| ServiceFormModal Dropdown | Task 6 |
| CalculatorPage Kategorie-Farben/Icons | Task 8 |
| PriceListPage categoryId | Task 6 |
| ServiceRow categoryName/Color | Task 6 + 8 |
| Seed-Endpunkt für Kategorien | Task 12 |
| CartItem.note Typ | Task 9 |
| Cart-State Migration | Task 9 |
| Notiz-Icon in ServiceRow | Task 10 |
| Notiz in DetailsModal | Task 11 |
| Notiz in PDF | Task 11 |
| LineComputation.note | Task 11 |
| Fehlerbehandlung 409 | Task 5 |