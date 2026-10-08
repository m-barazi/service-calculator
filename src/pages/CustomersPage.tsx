import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, User, X } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { usePagedList } from '../hooks/usePagedList'
import { fetchCustomersPage } from '../lib/api'
import type { Customer } from '../types'
import { CustomerFormModal } from '../components/CustomerFormModal'
import { CustomerDetail } from '../components/CustomerDetail'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 12

export function CustomersPage() {
  const { deleteCustomer } = useApp()
  const { data: customers, pagination, isLoading, loadPage, refresh } = usePagedList<Customer>({
    fetchPage: fetchCustomersPage,
    limit: PAGE_SIZE,
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Open customer detail from URL query param once customers are loaded
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || isLoading) return
    const customer = customers.find((c) => c.id === id)
    if (!customer) return
    setSelectedCustomer(customer)
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, customers])

  // Persist search filter in URL for deep-linking.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (search.trim()) next.set('search', search.trim())
        else next.delete('search')
        return next
      },
      { replace: true },
    )
  }, [search, setSearchParams])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.city?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.toLowerCase().includes(q) ?? false),
    )
  }, [search, customers])

  const openCreate = () => {
    setEditingCustomer(undefined)
    setModalOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingCustomer(undefined)
    refresh()
  }

  const openCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  const closeCustomer = () => {
    setSelectedCustomer(null)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setIsDeleting(true)
    try {
      await deleteCustomer(confirmDelete.id)
      if (selectedCustomer?.id === confirmDelete.id) {
        setSelectedCustomer(null)
      }
      await refresh()
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }

  if (selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        onBack={closeCustomer}
        onEdit={() => openEdit(selectedCustomer)}
        onDelete={() => setConfirmDelete(selectedCustomer)}
      />
    )
  }

  if (isLoading && customers.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink" />
            <p className="mt-4 text-sm text-ink-soft">Kunden wird geladen...</p>
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
          <p className="eyebrow">Kundenstammdaten</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Kunden
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Verwalte Adress- und Kontaktdaten deiner Kunden für Angebote.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Neuer Kunde
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kunden suchen..."
          className="input w-full pl-10 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 qty-btn"
            aria-label="Suche löschen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Empty state */}
      {customers.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <User className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">
            Noch keine Kunden vorhanden
          </p>
          <p className="text-2xs text-ink-muted">
            Lege deinen ersten Kunden an, um Angebote schneller zuzuordnen.
          </p>
          <button onClick={openCreate} className="btn-primary mt-3">
            <Plus className="h-4 w-4" />
            Ersten Kunden anlegen
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Search className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">Keine Treffer</p>
          <p className="text-2xs text-ink-muted">
            Passe die Suche an oder erstelle einen neuen Kunden.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={() => openEdit(customer)}
              onDelete={() => setConfirmDelete(customer)}
              onOpen={() => openCustomer(customer)}
            />
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={loadPage} />

      <CustomerFormModal open={modalOpen} onClose={closeModal} customer={editingCustomer} />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Kunde löschen?"
        description={`"${confirmDelete?.name}" wird dauerhaft entfernt. Angebote bleiben erhalten, verlieren aber die Kundenverknüpfung.`}
        confirmLabel={isDeleting ? 'Löschen...' : 'Löschen'}
        variant="danger"
        disabled={isDeleting}
      />
    </div>
  )
}

function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onOpen,
}: {
  customer: Customer
  onEdit: () => void
  onDelete: () => void
  onOpen: () => void
}) {
  return (
    <div className="card group flex flex-col gap-4 p-5 transition hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="font-semibold text-ink truncate group-hover:text-accent transition">{customer.name}</h3>
          {(customer.street || customer.city || customer.zip) && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {[customer.street, [customer.zip, customer.city].filter(Boolean).join(' '), customer.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </p>
          )}
        </button>
        <div className="flex shrink-0 gap-1">
          <button onClick={onEdit} className="qty-btn" title="Bearbeiten">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="qty-btn text-danger hover:bg-danger/10" title="Löschen">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-accent"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </a>
        )}
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-accent"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customer.phone}</span>
          </a>
        )}
      </div>
    </div>
  )
}

export default CustomersPage
