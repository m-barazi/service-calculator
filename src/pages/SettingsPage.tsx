import { useRef, useState } from 'react'
import {
  Building2,
  Download,
  Monitor,
  Moon,
  Percent,
  RotateCcw,
  Sun,
  Upload,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { exportAll, importAll, type BackupPayload } from '../lib/storage'
import { formatDate } from '../lib/format'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function SettingsPage() {
  const { settings, updateSettings } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message?: string
  }>({ kind: 'idle' })
  const [confirmReset, setConfirmReset] = useState(false)

  // ----- VAT slider state (percent, integer) -----
  const vatPct = Math.round(settings.vatRate * 100)

  // ----- Export -----
  const handleExport = () => {
    const payload = exportAll()
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `kostenrechner-backup-${ts}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ----- Import -----
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as BackupPayload
      importAll(data)
      setImportStatus({
        kind: 'success',
        message: `Backup vom ${formatDate(new Date(data.exportedAt))} wiederhergestellt.`,
      })
      // Reload to refresh state from storage
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setImportStatus({
        kind: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Datei konnte nicht eingelesen werden.',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ----- Reset -----
  const handleReset = () => {
    try {
      localStorage.removeItem('sc.services.v1')
      localStorage.removeItem('sc.settings.v1')
      localStorage.removeItem('sc.cart.v1')
    } catch {
      /* no-op */
    }
    window.location.reload()
  }

  return (
    <div className="space-y-8 pb-24 lg:pb-12">
      {/* ===== Header ===== */}
      <header className="space-y-2">
        <span className="eyebrow">Konfiguration</span>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Einstellungen
        </h1>
        <p className="max-w-2xl text-sm text-ink-soft">
          Passe Mehrwertsteuer, Firmenangaben und das Erscheinungsbild deines
          Kostenrechners an. Alle Daten werden lokal in deinem Browser
          gespeichert.
        </p>
      </header>

      {/* ===== MwSt ===== */}
      <section className="card p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Percent className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Mehrwertsteuer</h2>
              <p className="text-sm text-ink-soft">
                Wird auf alle Brutto-Berechnungen angewendet.
              </p>
            </div>
          </div>
          <div className="display-num text-2xl text-accent">{vatPct}&nbsp;%</div>
        </div>

        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={vatPct}
          onChange={(e) =>
            updateSettings({ vatRate: Number(e.target.value) / 100 })
          }
          className="w-full accent-accent"
          aria-label="Mehrwertsteuersatz"
        />
        <div className="mt-2 flex justify-between text-xs text-ink-faint num">
          <span>0&nbsp;%</span>
          <span>7&nbsp;%</span>
          <span>19&nbsp;%</span>
          <span>30&nbsp;%</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[0, 7, 19].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => updateSettings({ vatRate: preset / 100 })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                vatPct === preset
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-ink-soft hover:border-ink-faint hover:text-ink'
              }`}
            >
              {preset}&nbsp;%
            </button>
          ))}
        </div>
      </section>

      {/* ===== Company info ===== */}
      <section className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Firma</h2>
            <p className="text-sm text-ink-soft">
              Erscheint im Kopf des PDF-Berichts.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              Firmenname
            </span>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => updateSettings({ companyName: e.target.value })}
              className="input"
              placeholder="Mein Unternehmen"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              Untertitel / Tagline
            </span>
            <input
              type="text"
              value={settings.companyTagline}
              onChange={(e) =>
                updateSettings({ companyTagline: e.target.value })
              }
              className="input"
              placeholder="Dienstleistungen & Print"
            />
          </label>
        </div>
      </section>

      {/* ===== Theme ===== */}
      <section className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <Sun className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Erscheinungsbild</h2>
            <p className="text-sm text-ink-soft">
              Wähle Hell, Dunkel oder Systemvorgabe.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: 'light' as const, label: 'Hell', icon: Sun },
            { value: 'dark' as const, label: 'Dunkel', icon: Moon },
            { value: 'system' as const, label: 'System', icon: Monitor },
          ].map(({ value, label, icon: Icon }) => {
            const active = settings.theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => updateSettings({ theme: value })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'border-accent bg-accent/10 text-accent shadow-glow-accent'
                    : 'border-border text-ink-soft hover:border-ink-faint hover:text-ink'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== Data management ===== */}
      <section className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <Download className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Datenverwaltung</h2>
            <p className="text-sm text-ink-soft">
              Sichere oder importiere deine Preisliste und Einstellungen.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="btn-secondary"
          >
            <Download className="size-4" />
            Daten exportieren
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            className="btn-secondary"
          >
            <Upload className="size-4" />
            Daten importieren
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="btn-danger"
          >
            <RotateCcw className="size-4" />
            Auf Standard zurücksetzen
          </button>
        </div>

        {importStatus.kind !== 'idle' && (
          <p
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              importStatus.kind === 'success'
                ? 'border-accent/30 bg-accent/10 text-accent'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-500'
            }`}
            role="status"
          >
            {importStatus.message}
          </p>
        )}

        <p className="mt-4 text-xs text-ink-faint">
          Hinweis: Beim Zurücksetzen werden Preisliste, Warenkorb und
          Einstellungen aus dem Browser entfernt. Die Standard-Preisliste wird
          neu geladen.
        </p>
      </section>

      {/* ===== Confirm reset ===== */}
      <ConfirmDialog
        open={confirmReset}
        title="Wirklich zurücksetzen?"
        description="Alle deine Änderungen an der Preisliste, der laufende Warenkorb und die Einstellungen werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Ja, zurücksetzen"
        cancelLabel="Abbrechen"
        variant="danger"
        onConfirm={() => {
          setConfirmReset(false)
          handleReset()
        }}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  )
}
