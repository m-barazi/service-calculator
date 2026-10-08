import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  FileText,
  FolderKanban,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { formatDate, formatEUR } from '../lib/format'
import type { Customer, Invoice, Project, Quote } from '../types'

const QUOTE_STATUS_META: Record<
  string,
  { label: string; cls: string }
> = {
  draft: { label: 'Entwurf', cls: 'bg-ink-muted/10 text-ink-muted' },
  sent: { label: 'Gesendet', cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Angenommen', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Abgelehnt', cls: 'bg-red-100 text-red-700' },
}

const PROJECT_STATUS_META: Record<
  string,
  { label: string; cls: string }
> = {
  active: { label: 'Aktiv', cls: 'bg-emerald-100 text-emerald-700' },
  on_hold: { label: 'Pausiert', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Abgeschlossen', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Storniert', cls: 'bg-red-100 text-red-700' },
}

const INVOICE_STATUS_META: Record<
  string,
  { label: string; cls: string }
> = {
  draft: { label: 'Entwurf', cls: 'bg-ink-muted/10 text-ink-soft' },
  sent: { label: 'Versendet', cls: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Bezahlt', cls: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Überfällig', cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Storniert', cls: 'bg-danger/10 text-danger' },
}

type TabKey = 'overview' | 'quotes' | 'projects' | 'invoices' | 'notes'

interface CustomerDetailProps {
  customer: Customer
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

export function CustomerDetail({ customer, onBack, onEdit, onDelete }: CustomerDetailProps) {
  const { quotes, projects, invoices, addQuote, fetchQuoteDetail } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)

  const customerQuotes = useMemo(
    () => quotes.filter((q) => q.customerId === customer.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quotes, customer.id],
  )
  const customerProjects = useMemo(
    () => projects.filter((p) => p.customerId === customer.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects, customer.id],
  )
  const customerInvoices = useMemo(
    () => invoices.filter((i) => i.customerId === customer.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [invoices, customer.id],
  )

  const totalInvoicesGross = useMemo(
    () => customerInvoices.reduce((sum, i) => sum + i.totalGross, 0),
    [customerInvoices],
  )

  const handleCreateQuote = async () => {
    setIsCreatingQuote(true)
    try {
      const created = await addQuote({
        title: `Angebot ${customer.name}`,
        status: 'draft',
        discountValue: 0,
        customerId: customer.id,
      })
      const detail = await fetchQuoteDetail(created.id)
      navigate(`/angebote?id=${detail.id}`)
    } finally {
      setIsCreatingQuote(false)
    }
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'overview', label: 'Übersicht', count: 0 },
    { key: 'quotes', label: 'Angebote', count: customerQuotes.length },
    { key: 'projects', label: 'Projekte', count: customerProjects.length },
    { key: 'invoices', label: 'Rechnungen', count: customerInvoices.length },
    { key: 'notes', label: 'Notizen', count: 0 },
  ]

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <p className="eyebrow">Kunde</p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{customer.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Kunde seit {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="btn-secondary text-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              E-Mail
            </a>
          )}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="btn-secondary text-xs"
            >
              <Phone className="h-3.5 w-3.5" />
              Anrufen
            </a>
          )}
          <button
            onClick={handleCreateQuote}
            disabled={isCreatingQuote}
            className="btn-primary text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {isCreatingQuote ? 'Erstelle…' : 'Angebot'}
          </button>
          <button onClick={onEdit} className="qty-btn" title="Bearbeiten">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="qty-btn text-danger hover:bg-danger/10" title="Löschen">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-nowrap gap-2 overflow-x-auto border-b border-border pb-px scrollbar-hide sm:flex-wrap sm:overflow-visible">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'relative shrink-0 px-3 py-2.5 text-sm font-medium transition',
              activeTab === tab.key
                ? 'text-ink'
                : 'text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-elevated px-1.5 py-0.5 text-2xs font-semibold text-ink-muted num">
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          customer={customer}
          quoteCount={customerQuotes.length}
          projectCount={customerProjects.length}
          invoiceCount={customerInvoices.length}
          invoicesTotal={totalInvoicesGross}
        />
      )}
      {activeTab === 'quotes' && (
        <QuotesTab quotes={customerQuotes} />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab projects={customerProjects} />
      )}
      {activeTab === 'invoices' && (
        <InvoicesTab invoices={customerInvoices} />
      )}
      {activeTab === 'notes' && (
        <NotesTab customer={customer} />
      )}
    </div>
  )
}

function OverviewTab({
  customer,
  quoteCount,
  projectCount,
  invoiceCount,
  invoicesTotal,
}: {
  customer: Customer
  quoteCount: number
  projectCount: number
  invoiceCount: number
  invoicesTotal: number
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard icon={FileText} value={quoteCount.toString()} label="Angebote" />
          <KpiCard icon={FolderKanban} value={projectCount.toString()} label="Projekte" />
          <KpiCard icon={ReceiptText} value={invoiceCount.toString()} label="Rechnungen" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard icon={ReceiptText} value={formatEUR(invoicesTotal)} label="Rechnungssumme (brutto)" accent />
        </div>
      </div>

      <div className="card flex flex-col gap-5 p-5">
        <p className="eyebrow">Kontaktdaten</p>
        <div className="flex flex-col gap-3 text-sm">
          {(customer.street || customer.city || customer.zip) && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
              <span className="text-ink">
                {[customer.street, [customer.zip, customer.city].filter(Boolean).join(' '), customer.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-ink transition hover:text-accent">
              <Mail className="h-4 w-4 shrink-0 text-ink-muted" />
              <span>{customer.email}</span>
            </a>
          )}
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-ink transition hover:text-accent">
              <Phone className="h-4 w-4 shrink-0 text-ink-muted" />
              <span>{customer.phone}</span>
            </a>
          )}
          {!customer.street && !customer.city && !customer.zip && !customer.email && !customer.phone && (
            <p className="text-sm text-ink-muted">
              Keine Kontaktdaten hinterlegt.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function QuotesTab({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Noch keine Angebote"
        description="Erstelle ein Angebot für diesen Kunden."
      />
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {quotes.map((quote) => {
        const meta = QUOTE_STATUS_META[quote.status] ?? QUOTE_STATUS_META.draft
        return (
          <Link
            key={quote.id}
            to={`/angebote?id=${quote.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3 transition hover:border-border-strong"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{quote.title}</p>
              <p className="text-2xs text-ink-muted">
                {quote.quoteNumber || 'Ohne Nummer'} · {formatDate(quote.createdAt)}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${meta.cls}`}>
              {meta.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function ProjectsTab({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Noch keine Projekte"
        description="Ordne diesem Kunden ein Projekt zu."
      />
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {projects.map((project) => {
        const meta = PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.active
        return (
          <Link
            key={project.id}
            to={`/projekte?id=${project.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3 transition hover:border-border-strong"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{project.name}</p>
              {project.description && (
                <p className="text-2xs text-ink-muted truncate">{project.description}</p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${meta.cls}`}>
              {meta.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Noch keine Rechnungen"
        description="Rechnungen werden aus angenommenen Angeboten erstellt."
      />
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {invoices.map((invoice) => {
        const meta = INVOICE_STATUS_META[invoice.status] ?? INVOICE_STATUS_META.draft
        return (
          <Link
            key={invoice.id}
            to={`/rechnungen?id=${invoice.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3 transition hover:border-border-strong"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{invoice.title}</p>
              <p className="text-2xs text-ink-muted">
                {invoice.invoiceNumber} · {formatDate(invoice.createdAt)}
                {invoice.dueDate && ` · Fällig ${formatDate(invoice.dueDate)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="num text-sm font-semibold text-ink">{formatEUR(invoice.totalGross)}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function NotesTab({ customer }: { customer: Customer }) {
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <StickyNote className="h-5 w-5 text-ink-muted" />
        <p className="eyebrow">Interne Notizen</p>
      </div>
      {customer.notes ? (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">{customer.notes}</p>
      ) : (
        <p className="text-sm text-ink-muted">Keine Notizen hinterlegt.</p>
      )}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: typeof FileText
  value: string
  label: string
  accent?: boolean
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">{label}</p>
          <p className={['mt-2 num text-2xl font-bold tracking-tight', accent ? 'text-accent-strong' : 'text-ink'].join(' ')}>
            {value}
          </p>
        </div>
        <div className={['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent ? 'bg-accent/10 text-accent' : 'bg-surface text-ink-muted'].join(' ')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText
  title: string
  description: string
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
      <Icon className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
      <p className="mt-2 text-sm font-medium text-ink">{title}</p>
      <p className="text-2xs text-ink-muted">{description}</p>
    </div>
  )
}
