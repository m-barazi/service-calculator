import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  CheckCircle,
  Clock,
  FileText,
  FolderKanban,
  Mail,
  RefreshCw,
  Send,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { formatEUR, formatDate } from '../lib/format'

const QUICK_LINKS: { to: string; label: string; icon: typeof FileText; description: string }[] = [
  { to: '/rechner', label: 'Rechner', icon: Calculator, description: 'Neue Kalkulation starten' },
  { to: '/angebote', label: 'Angebote', icon: FileText, description: 'Alle Angebote ansehen' },
  { to: '/kunden', label: 'Kunden', icon: Mail, description: 'Kundenstammdaten verwalten' },
  { to: '/projekte', label: 'Projekte', icon: FolderKanban, description: 'Projekte und Angebote gruppieren' },
]

const STATUS_META: Record<
  string,
  { label: string; icon: typeof FileText; cls: string }
> = {
  draft: { label: 'Entwurf', icon: Clock, cls: 'bg-ink-muted/10 text-ink-muted' },
  sent: { label: 'Gesendet', icon: Send, cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Angenommen', icon: CheckCircle, cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Abgelehnt', icon: XCircle, cls: 'bg-red-100 text-red-700' },
}

export function DashboardPage() {
  const { customers, dashboard, isLoadingDashboard, refreshDashboard } = useApp()

  if (isLoadingDashboard) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink" />
            <p className="mt-4 text-sm text-ink-soft">Dashboard wird geladen...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Übersicht</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Kennzahlen zu Angeboten, Umsatz und beliebten Leistungen.
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={isLoadingDashboard}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </button>
      </div>

      {!dashboard && (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <TrendingUp className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink">Keine Daten verfügbar</p>
        </div>
      )}

      {dashboard && (
        <>
          {/* Quick links */}
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-border-strong hover:bg-surface/80"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink-soft transition group-hover:text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{link.label}</p>
                    <p className="text-2xs text-ink-muted">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:text-ink" />
                </Link>
              )
            })}
          </div>

          {/* KPI cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Angebote insgesamt"
              value={String(dashboard.quoteCount)}
              icon={FileText}
            />
            <KpiCard
              label="Angenommen (Brutto)"
              value={formatEUR(dashboard.acceptedTotalGross)}
              icon={CheckCircle}
              accent
            />
            <KpiCard
              label="Ø Monatsumsatz (90 Tage)"
              value={formatEUR(dashboard.estimatedMonthlyRecurring)}
              icon={TrendingUp}
            />
            <KpiCard
              label="Kundenstammdaten"
              value={String(customers.length)}
              icon={Mail}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Status chart */}
            <div className="card p-5">
              <p className="eyebrow">Angebotsstatus</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">Verteilung</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(dashboard.quoteStatusCounts).map(([status, count]) => {
                  const meta = STATUS_META[status] ?? STATUS_META.draft
                  const Icon = meta.icon
                  const pct = dashboard.quoteCount > 0 ? Math.round((count / dashboard.quoteCount) * 100) : 0
                  return (
                    <div
                      key={status}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.cls}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{meta.label}</p>
                        <p className="text-2xs text-ink-muted">{count} Angebot{count === 1 ? '' : 'e'} · {pct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top services */}
            <div className="card p-5">
              <p className="eyebrow">Beliebte Leistungen</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">Top 5</h2>
              {dashboard.topServices.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">Noch keine Leistungen in Angeboten.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {dashboard.topServices.map((s, idx) => (
                    <div
                      key={s.serviceId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-2xs font-semibold text-ink-muted">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="num text-sm font-semibold text-ink">{formatEUR(s.totalGross)}</p>
                        <p className="text-2xs text-ink-muted">{s.count}× gebucht</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent quotes */}
          <div className="mt-6 card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Neueste Angebote</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">Letzte 5</h2>
              </div>
              <Link to="/angebote" className="btn-ghost text-xs">
                Alle anzeigen
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {dashboard.recentQuotes.length === 0 ? (
              <p className="text-sm text-ink-muted">Noch keine Angebote vorhanden.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dashboard.recentQuotes.map((quote) => {
                  const meta = STATUS_META[quote.status] ?? STATUS_META.draft
                  return (
                    <Link
                      key={quote.id}
                      to={`/angebote?id=${quote.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3 transition hover:border-border-strong"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">
                          {quote.title}
                        </p>
                        <p className="text-2xs text-ink-muted">
                          {quote.quoteNumber || 'Ohne Nummer'} · {formatDate(quote.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon: typeof FileText
  accent?: boolean
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">{label}</p>
          <p
            className={[
              'mt-2 num text-3xl font-bold tracking-tight',
              accent ? 'text-accent-strong' : 'text-ink',
            ].join(' ')}
          >
            {value}
          </p>
        </div>
        <div
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            accent ? 'bg-accent/10 text-accent' : 'bg-surface text-ink-muted',
          ].join(' ')}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
