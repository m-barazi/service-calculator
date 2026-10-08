import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FileText, FolderKanban, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import type { Project, ProjectStatus, Quote } from '../types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatDate } from '../lib/format'

const STATUS_META: Record<
  ProjectStatus,
  { label: string; cls: string }
> = {
  active: { label: 'Aktiv', cls: 'bg-emerald-100 text-emerald-700' },
  on_hold: { label: 'Pausiert', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Abgeschlossen', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Storniert', cls: 'bg-red-100 text-red-700' },
}

export function ProjectsPage() {
  const {
    projects,
    isLoadingProjects,
    customers,
    deleteProject,
    addProject,
    updateProject,
    fetchProjectQuotes,
  } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectQuotes, setProjectQuotes] = useState<Quote[]>([])
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    )
  }, [search, projects])

  const openCreate = () => {
    setEditingProject(undefined)
    setModalOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditingProject(project)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingProject(undefined)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setIsDeleting(true)
    try {
      await deleteProject(confirmDelete.id)
      if (selectedProject?.id === confirmDelete.id) {
        setSelectedProject(null)
        setProjectQuotes([])
      }
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }

  const openProjectDetail = async (project: Project) => {
    setSelectedProject(project)
    setIsLoadingQuotes(true)
    try {
      const quotes = await fetchProjectQuotes(project.id)
      setProjectQuotes(quotes)
    } finally {
      setIsLoadingQuotes(false)
    }
  }

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        quotes={projectQuotes}
        isLoadingQuotes={isLoadingQuotes}
        onBack={() => setSelectedProject(null)}
        onEdit={() => openEdit(selectedProject)}
        onDelete={() => setConfirmDelete(selectedProject)}
        onOpenQuote={(id) => navigate(`/angebote?id=${id}`)}
      />
    )
  }

  if (isLoadingProjects && projects.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink" />
            <p className="mt-4 text-sm text-ink-soft">Projekte werden geladen...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Projektverwaltung</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Projekte
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Gruppiere Angebote nach Projekten und behalte den Überblick.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Neues Projekt
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Projekte suchen..."
          className="input w-full pl-10"
        />
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <FolderKanban className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">
            Noch keine Projekte vorhanden
          </p>
          <p className="text-2xs text-ink-muted">
            Lege dein erstes Projekt an, um Angebote zu gruppieren.
          </p>
          <button onClick={openCreate} className="btn-primary mt-3">
            <Plus className="h-4 w-4" />
            Erstes Projekt anlegen
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Search className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">Keine Treffer</p>
          <p className="text-2xs text-ink-muted">
            Passe die Suche an oder erstelle ein neues Projekt.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              customers={customers}
              onEdit={() => openEdit(project)}
              onDelete={() => setConfirmDelete(project)}
              onOpen={() => openProjectDetail(project)}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={modalOpen}
        onClose={closeModal}
        project={editingProject}
        customers={customers}
        onSave={async (payload) => {
          if (editingProject) {
            await updateProject(editingProject.id, payload)
          } else {
            await addProject(payload)
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Projekt löschen?"
        description={`"${confirmDelete?.name}" wird dauerhaft entfernt. Zugeordnete Angebote bleiben erhalten, verlieren aber die Projektzuordnung.`}
        confirmLabel={isDeleting ? 'Löschen...' : 'Löschen'}
        variant="danger"
        disabled={isDeleting}
      />
    </div>
  )
}

function ProjectCard({
  project,
  customers,
  onEdit,
  onDelete,
  onOpen,
}: {
  project: Project
  customers: { id: string; name: string }[]
  onEdit: () => void
  onDelete: () => void
  onOpen: () => void
}) {
  const meta = STATUS_META[project.status] ?? STATUS_META.active
  const customer = customers.find((c) => c.id === project.customerId)

  return (
    <div className="card group flex flex-col gap-3 p-5 transition hover:border-ink-faint">
      <button onClick={onOpen} className="text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-ink truncate">{project.name}</h3>
            {customer && <p className="mt-1 text-sm text-ink-soft truncate">{customer.name}</p>}
            {project.description && (
              <p className="mt-2 text-2xs text-ink-muted line-clamp-2">{project.description}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${meta.cls}`}>
            {meta.label}
          </span>
        </div>
      </button>
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-border pt-3">
        <button onClick={onEdit} className="qty-btn" title="Bearbeiten">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="qty-btn text-danger hover:bg-danger/10" title="Löschen">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function ProjectDetail({
  project,
  quotes,
  isLoadingQuotes,
  onBack,
  onEdit,
  onDelete,
  onOpenQuote,
}: {
  project: Project
  quotes: Quote[]
  isLoadingQuotes: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onOpenQuote: (id: string) => void
}) {
  const { customers } = useApp()
  const meta = STATUS_META[project.status] ?? STATUS_META.active
  const customer = customers.find((c) => c.id === project.customerId)

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Projekt</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{project.name}</h1>
          {customer && <p className="mt-1 text-sm text-ink-soft">{customer.name}</p>}
          {project.description && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
          <button onClick={onEdit} className="qty-btn" title="Bearbeiten">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="qty-btn text-danger hover:bg-danger/10" title="Löschen">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Angebote</p>
              <h2 className="text-lg font-semibold text-ink">Zugeordnete Angebote</h2>
            </div>
            <Link to={`/angebote?projectId=${project.id}`} className="btn-ghost text-xs">
              Angebot erstellen
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoadingQuotes ? (
            <div className="card flex items-center justify-center py-12">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-ink-muted border-t-ink" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
              <FileText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
              <p className="text-sm font-medium text-ink">Noch keine Angebote</p>
              <p className="text-2xs text-ink-muted">
                Erstelle ein Angebot und ordne es diesem Projekt zu.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {quotes.map((quote) => {
                const statusInfo =
                  {
                    draft: { label: 'Entwurf', cls: 'bg-ink-muted/10 text-ink-muted' },
                    sent: { label: 'Gesendet', cls: 'bg-blue-100 text-blue-700' },
                    accepted: { label: 'Angenommen', cls: 'bg-emerald-100 text-emerald-700' },
                    rejected: { label: 'Abgelehnt', cls: 'bg-red-100 text-red-700' },
                  }[quote.status] ?? { label: quote.status, cls: 'bg-ink-muted/10 text-ink-muted' }
                return (
                  <button
                    key={quote.id}
                    onClick={() => onOpenQuote(quote.id)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3 text-left transition hover:border-border-strong"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{quote.title}</p>
                      <p className="text-2xs text-ink-muted">
                        {quote.quoteNumber || 'Ohne Nummer'} · {formatDate(quote.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-4 p-5">
          <p className="eyebrow">Details</p>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Status</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Kunde</span>
              <span className="text-ink">{customer?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Angebote</span>
              <span className="num text-ink">{quotes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Erstellt</span>
              <span className="text-ink">{formatDate(project.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProjectFormModalProps {
  open: boolean
  onClose: () => void
  project?: Project
  customers: { id: string; name: string }[]
  onSave: (payload: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
}

function ProjectFormModal({ open, onClose, project, customers, onSave }: ProjectFormModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (project) {
      setName(project.name)
      setDescription(project.description ?? '')
      setCustomerId(project.customerId ?? '')
      setStatus(project.status)
    } else {
      setName('')
      setDescription('')
      setCustomerId('')
      setStatus('active')
    }
    setError('')
  }, [project, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name ist erforderlich')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        customerId: customerId || undefined,
        status,
      })
      onClose()
    } catch (err) {
      setError('Speichern fehlgeschlagen')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-canvas/60 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        className="relative flex w-full flex-col overflow-hidden bg-elevated shadow-elevated animate-slide-up rounded-t-3xl sm:animate-scale-in sm:rounded-3xl sm:border sm:border-border max-h-[92vh] sm:max-h-[88vh] max-w-md"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
              {project ? 'Projekt bearbeiten' : 'Neues Projekt'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {project ? 'Aktualisiere Projekt-Details.' : 'Lege ein neues Projekt an.'}
            </p>
          </div>
          <button onClick={onClose} className="qty-btn -m-1 shrink-0" aria-label="Schließen">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="grid gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Projektname"
                className="input w-full"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">Kunde (optional)</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input w-full appearance-none"
              >
                <option value="">Kein Kunde</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="input w-full appearance-none"
              >
                <option value="active">Aktiv</option>
                <option value="on_hold">Pausiert</option>
                <option value="completed">Abgeschlossen</option>
                <option value="cancelled">Storniert</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">Beschreibung (optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung"
                rows={3}
                className="input w-full resize-none"
              />
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-canvas/40 px-5 py-3 sm:px-6">
          <button onClick={onClose} className="btn-secondary" type="button">
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Speichere…' : project ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectsPage
