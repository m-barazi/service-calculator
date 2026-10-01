# Dienstleistungs-Kostenrechner

Eine moderne Web-App zur Berechnung von Dienstleistungskosten, Verwaltung von Preislisten, Erstellung von Kundenangeboten und PDF-Export.

**Stack:** Vite · React 18 · TypeScript · Tailwind CSS · Node.js · Express · PostgreSQL · jsPDF
**Sprache der UI:** Deutsch
**Persistenz:**
- Leistungen, Kategorien und Angebote → PostgreSQL über REST-API
- Warenkorb und App-Einstellungen → Browser-`localStorage`

---

## Features

- **Leistungsauswahl** mit Live-Summe (Netto / Brutto / Gewinn / Marge)
- **Detail-Ansicht** mit Kundenname, Projekttitel und PDF-Bericht
- **Preisliste verwalten** — anlegen, bearbeiten, löschen, klonen, ein-/ausblenden
- **Kategorien verwalten** — mit Farbe, Icon, Reihenfolge und Sichtbarkeit
- **Angebote erstellen** — aus dem Warenkorb oder von Grund auf, mit Rabatt, Gültigkeitsdatum und Status
- **Angebots-PDF** — Kunden- und interne Version
- **Mehrwertsteuer** stufenlos einstellbar (0–30 %)
- **Dark Mode** (Hell / Dunkel / System)
- **Backup** als JSON exportieren und wieder einspielen
- **Responsive** — Desktop, Tablet, Mobile (Bottom-Nav)

---

## Lokale Entwicklung

Voraussetzungen: Node.js 20+ (oder 18 LTS), npm, Docker & Docker Compose.

### 1. Umgebungsvariablen anlegen

```bash
cp .env.example .env
```

Trage sichere Werte ein, insbesondere `DB_PASSWORD`.

### 2. Docker-Compose starten

```bash
docker compose up --build
```

Das startet drei Services:
- **db** — PostgreSQL 16
- **backend** — Express-API auf Port 3000
- **app** — Vite-Frontend (via nginx auf Port 80)

Die App ist dann unter http://localhost erreichbar. Das Backend-API liegt unter http://localhost/api.

### 3. Datenbank mit Beispieldaten befüllen (optional)

Beim ersten Start erzeugt das Backend automatisch die benötigten Tabellen. Beispieldaten kannst du über den Seed-Endpunkt einspielen:

```bash
curl -X POST http://localhost/api/seed
```

### 4. Frontend-Entwicklung ohne Docker (optional)

Für schnelleres Iterieren:

```bash
npm install
npm run dev
```

In einem separaten Terminal:

```bash
cd backend
npm install
npm run dev
```

Stelle sicher, dass PostgreSQL läuft und die Umgebungsvariablen aus `.env` gesetzt sind.

---

## Build

```bash
npm run build
```

Erzeugt das Verzeichnis `dist/` mit statischen Dateien. Für Produktion wird das Frontend in einem nginx-Container ausgeliefert, das Backend als separater Container.

---

## Deployment auf Ubuntu VPS

Empfohlener Stack: Docker Compose + Traefik (für HTTPS & Routing).

### 1. Voraussetzungen auf dem Server

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx-certbot
```

### 2. Projekt auf den Server kopieren

```bash
git clone <dein-repo> /opt/service-calculator
cd /opt/service-calculator
cp .env.example .env
# .env anpassen
```

### 3. Traefik-Setup (empfohlen)

Die `docker-compose.yml` enthält bereits Traefik-Labels für die Domain `calculator.barazi.cloud`. Stelle sicher, dass ein externes Traefik-Netzwerk existiert:

```bash
docker network create traefik-public
```

Starte die App:

```bash
docker compose up -d
```

Traefik übernimmt automatisch HTTPS via Let's Encrypt.

### 4. Manuelles nginx-Deployment (Alternative)

Falls du kein Traefik nutzen möchtest:

```bash
npm install
npm run build
cd backend && npm install && cd ..
sudo mkdir -p /var/www/service-calculator
sudo cp -r dist/* /var/www/service-calculator/
sudo cp nginx.conf.example /etc/nginx/sites-available/service-calculator
# Domain in der nginx-Config anpassen
sudo ln -s /etc/nginx/sites-available/service-calculator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Updates ausrollen

```bash
cd /opt/service-calculator
git pull
docker compose down
docker compose up --build -d
```

**Wichtig:** Da Leistungen, Kategorien und Angebote in der Datenbank liegen, vor größeren Änderungen ein Backup unter *Einstellungen → Daten exportieren* erstellen.

---

## Datenmodell

| Bereich | Persistenz | Inhalt |
|---|---|---|
| Leistungen | PostgreSQL (`services`) | Name, Kategorie, Einkaufs-/Verkaufspreis, Sichtbarkeit |
| Kategorien | PostgreSQL (`categories`) | Name, Beschreibung, Icon, Farbe, Sortierung |
| Angebote | PostgreSQL (`quotes`, `quote_items`) | Titel, Kunde, Status, Rabatt, Positionen |
| Warenkorb | `localStorage` (`sc.cart.v1`) | `{ serviceId: { quantity, note } }` |
| Einstellungen | `localStorage` (`sc.settings.v1`) | MwSt., Firma, Theme |

### Backup-Format (`Daten exportieren`)

```json
{
  "version": 2,
  "exportedAt": "2025-01-15T10:00:00.000Z",
  "services": [...],
  "categories": [...],
  "settings": {...}
}
```

Der Import erstellt fehlende Kategorien und Leistungen in der Datenbank und aktualisiert bestehende. Einstellungen werden im Browser gespeichert.

---

## API-Endpunkte

Basis-URL: `/api`

| Ressource | Methoden |
|---|---|
| `/services` | GET, POST |
| `/services/:id` | GET, PUT, DELETE |
| `/categories` | GET, POST |
| `/categories/:id` | GET, PUT, DELETE |
| `/quotes` | GET, POST |
| `/quotes/:id` | GET, PUT, DELETE |
| `/quotes/:id/duplicate` | POST |
| `/quotes/:id/items` | GET (implizit), POST |
| `/quotes/:id/items/:itemId` | PUT, DELETE |
| `/quotes/:id/items/reorder` | PATCH |
| `/seed` | POST |
| `/health` | GET |

---

## Projektstruktur

```
├── backend/                 # Node.js / Express API
│   ├── src/index.js         # API-Routen & Server-Start
│   └── init.sql             # Initiales Schema (siehe auch db/init.sql)
├── db/                      # PostgreSQL-Image mit init.sql
├── public/                  # Statische Assets, Manifest, Favicon
├── src/
│   ├── components/          # UI-Bausteine
│   ├── hooks/               # useApp (Global State), useTheme
│   ├── lib/                 # api, calc, format, pdf, storage
│   ├── pages/               # Seiten (Rechner, Angebote, Kategorien, Preisliste, Einstellungen)
│   ├── App.tsx              # Routes
│   ├── main.tsx             # Entry
│   ├── index.css            # Tailwind + Design-Tokens
│   └── types.ts             # Domain-Typen
├── docker-compose.yml       # Produktions-Setup
├── Dockerfile               # Frontend-Build mit nginx
├── nginx.conf               # nginx-Default-Config
├── nginx.conf.example       # Beispiel-Config für manuelles Deployment
└── .env.example             # Erforderliche Umgebungsvariablen
```

---

## Lizenz

Privates Projekt — alle Rechte vorbehalten.
