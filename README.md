# Dienstleistungs-Kostenrechner

Eine moderne, schlanke Web-App zur Berechnung von Dienstleistungskosten mit
Preislistenverwaltung und PDF-Export. Komplett im Browser — keine Datenbank,
kein Backend nötig.

**Stack:** Vite · React 18 · TypeScript · Tailwind CSS · jsPDF
**Sprache der UI:** Deutsch
**Persistenz:** `localStorage` (mit Export/Import als JSON-Backup)

---

## Features

- **Leistungsauswahl** mit Live-Summe (Netto / Brutto / Gewinn / Marge)
- **Detail-Ansicht** mit Kundenname, Projekttitel und PDF-Bericht
- **Preisliste verwalten** — anlegen, bearbeiten, löschen, ein-/ausblenden
- **Mehrwertsteuer** stufenlos einstellbar (0–30 %)
- **Dark Mode** (Hell / Dunkel / System)
- **Backup** als JSON exportieren und wieder einspielen
- **Responsive** — Desktop, Tablet, Mobile (Bottom-Nav)

---

## Lokale Entwicklung

Voraussetzungen: Node.js 20+ (oder 18 LTS), npm.

```bash
npm install
npm run dev
```

Die App läuft dann auf <http://localhost:5173>.

### Build

```bash
npm run build
```

Erzeugt das Verzeichnis `dist/` mit statischen Dateien (HTML, JS, CSS).

### Vorschau

```bash
npm run preview
```

---

## Deployment auf Ubuntu VPS

Da es sich um eine reine Single-Page-App handelt, brauchst du nur einen
Webserver, der die statischen Dateien aus `dist/` ausliefert. Empfehlung:
**nginx**.

### 1. Build lokal erzeugen

```bash
npm install
npm run build
```

### 2. Dateien auf den Server kopieren

```bash
# Beispiel: per scp
ssh root@dein-server "mkdir -p /var/www/kostenrechner"
scp -r dist/* root@dein-server:/var/www/kostenrechner/
```

Oder direkt auf dem Server:

```bash
git clone <dein-repo> /opt/kostenrechner
cd /opt/kostenrechner
npm ci
npm run build
sudo mkdir -p /var/www/kostenrechner
sudo cp -r dist/* /var/www/kostenrechner/
sudo chown -R www-data:www-data /var/www/kostenrechner
```

### 3. nginx installieren und konfigurieren

```bash
sudo apt update
sudo apt install -y nginx
```

Lege eine Site-Konfiguration an, z.B.
`/etc/nginx/sites-available/kostenrechner`:

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/kostenrechner
sudo nano /etc/nginx/sites-available/kostenrechner   # Domain anpassen
sudo ln -s /etc/nginx/sites-available/kostenrechner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Siehe [`nginx.conf.example`](./nginx.conf.example) für eine fertige Vorlage
mit Gzip, Cache-Headern und SPA-Fallback.

### 4. HTTPS mit Let's Encrypt (empfohlen)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kostenrechner.deine-domain.de
```

Certbot trägt die SSL-Konfiguration automatisch in deinen nginx-Server-Block
ein und richtet die Auto-Erneuerung ein.

### 5. Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Updates ausrollen

```bash
cd /opt/kostenrechner
git pull
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/kostenrechner/
```

Da alle Daten im Browser des Anwenders liegen, gehen bei einem Re-Deploy
**keine Daten verloren**. Trotzdem sollte vor größeren Änderungen ein
Export aus dem Einstellungen-Tab gemacht werden.

---

## Datenmodell

| Bereich     | Schlüssel im `localStorage` | Inhalt                                    |
| ----------- | --------------------------- | ----------------------------------------- |
| Preisliste  | `sc.services.v1`            | Array aller Leistungen                    |
| Warenkorb   | `sc.cart.v1`                | `{ serviceId: quantity }`                 |
| Einstellungen | `sc.settings.v1`          | MwSt., Firma, Theme                       |

Backup-Format (`Daten exportieren`):

```json
{
  "version": 1,
  "exportedAt": "2025-01-15T10:00:00.000Z",
  "services": [...],
  "settings": {...}
}
```

---

## Projektstruktur

```
src/
├── components/      # UI-Bausteine (Layout, Modal, ServiceRow, …)
├── data/            # Seed-Preisliste (CSV-Import)
├── hooks/           # useApp (Context), useTheme
├── lib/             # calc, format, pdf, storage
├── pages/           # CalculatorPage, PriceListPage, SettingsPage
├── App.tsx          # Routes
├── main.tsx         # Entry
├── index.css        # Tailwind + Design-Tokens
└── types.ts         # Domain-Typen
```

---

## Lizenz

Privates Projekt — alle Rechte vorbehalten.
