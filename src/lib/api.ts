/// <reference types="vite/client" />
import type { Service, ServiceStats, ServiceListParams, Category, Customer, Quote, QuoteItem, QuoteWithItems, DashboardData, Project, Invoice, InvoiceWithItems, InvoiceStatus, PaginatedResponse, PaginationMeta } from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

/** Extract a readable error message from a fetch response. */
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
  } catch {
    // non-JSON response
  }
  return fallback
}

function toCamel(row: any): Service {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id ?? row.categoryId,
    purchasePrice: parseFloat(row.purchase_price ?? row.purchasePrice ?? 0),
    salePrice: parseFloat(row.sale_price ?? row.salePrice ?? 0),
    defaultQuantity: row.default_quantity ?? row.defaultQuantity ?? 1,
    url: row.url,
    note: row.note,
    visible: row.visible,
    pinned: row.pinned ?? false,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch(`${API_URL}/services`)
  if (!res.ok) throw new Error(await extractError(res, 'Preisliste konnte nicht geladen werden'))
  const data = await res.json()
  return data.map(toCamel)
}

export async function fetchServicesPage({ page, limit, search, categoryId, visible }: ServiceListParams): Promise<PaginatedResponse<Service>> {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (limit !== undefined) params.set('limit', String(limit))
  if (search) params.set('search', search)
  if (categoryId) params.set('categoryId', categoryId)
  if (visible !== undefined) params.set('visible', String(visible))
  const res = await fetch(`${API_URL}/services?${params.toString()}`)
  if (!res.ok) throw new Error(await extractError(res, 'Preisliste konnte nicht geladen werden'))
  const data = await res.json()
  return {
    data: data.data.map(toCamel),
    pagination: data.pagination,
  }
}

export async function fetchServiceStats(): Promise<ServiceStats> {
  const res = await fetch(`${API_URL}/services/stats`)
  if (!res.ok) throw new Error(await extractError(res, 'Preislisten-Statistik konnte nicht geladen werden'))
  return res.json()
}

export async function createService(service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
  const res = await fetch(`${API_URL}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Leistung konnte nicht erstellt werden'))
  const data = await res.json()
  return toCamel(data)
}

export async function updateService(id: string, patch: Partial<Service>): Promise<Service> {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Leistung konnte nicht aktualisiert werden'))
  const data = await res.json()
  return toCamel(data)
}

export async function deleteService(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await extractError(res, 'Leistung konnte nicht gelöscht werden'))
}

// ===== Category API =====

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`)
  if (!res.ok) throw new Error(await extractError(res, 'Kategorien konnten nicht geladen werden'))
  const data = await res.json()
  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
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
  if (!res.ok) throw new Error(await extractError(res, 'Kategorie konnte nicht erstellt werden'))
  const data = await res.json()
  return data
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Kategorie konnte nicht aktualisiert werden'))
  const data = await res.json()
  return data
}

export async function reorderCategories(ids: string[]): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Kategorien konnten nicht neu sortiert werden'))
  const data = await res.json()
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' })
  if (res.status === 409) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Kategorie wird noch von Leistungen verwendet')
  }
  if (!res.ok && res.status !== 204) throw new Error(await extractError(res, 'Kategorie konnte nicht gelöscht werden'))
}

// ===== Customer API =====

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_URL}/customers`)
  if (!res.ok) throw new Error(await extractError(res, 'Kunden konnten nicht geladen werden'))
  const data = await res.json()
  return data.map(toCamelCustomer)
}

export async function fetchCustomersPage(page: number, limit: number): Promise<PaginatedResponse<Customer>> {
  const res = await fetch(`${API_URL}/customers?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error(await extractError(res, 'Kunden konnten nicht geladen werden'))
  const data = await res.json()
  return {
    data: data.data.map(toCamelCustomer),
    pagination: data.pagination as PaginationMeta,
  }
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  const res = await fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Kunde konnte nicht erstellt werden'))
  const data = await res.json()
  return toCamelCustomer(data)
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${API_URL}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Kunde konnte nicht aktualisiert werden'))
  const data = await res.json()
  return toCamelCustomer(data)
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' })
  if (res.status === 409) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Kunde wird noch von Angeboten verwendet')
  }
  if (!res.ok && res.status !== 204) throw new Error(await extractError(res, 'Kunde konnte nicht gelöscht werden'))
}

// ===== Bulk Import =====

export async function importBackup(
  services: Service[],
  categories: Category[],
  existingCategories: Category[],
  existingServices: Service[],
): Promise<{ createdCategories: number; createdServices: number; updatedServices: number }> {
  // Build a map: category name → category ID
  // First from existing categories, then from newly created ones
  const categoryNameToId = new Map<string, string>()
  for (const cat of existingCategories) {
    categoryNameToId.set(cat.name, cat.id)
  }

  let createdCategories = 0

  // Create categories that don't exist yet
  for (const cat of categories) {
    if (!categoryNameToId.has(cat.name)) {
      const created = await createCategory({
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        sortOrder: cat.sortOrder,
        visible: cat.visible,
      })
      categoryNameToId.set(cat.name, created.id)
      createdCategories++
    }
  }

  // Build a set of existing service IDs for update detection
  const existingServiceIds = new Set(existingServices.map((s) => s.id))

  let createdServices = 0
  let updatedServices = 0

  // Create or update services
  for (const svc of services) {
    // Resolve categoryId from category name if categoryId is empty (v1 migration)
    let categoryId = svc.categoryId
    if (!categoryId && (svc as any).category) {
      categoryId = categoryNameToId.get((svc as any).category) ?? ''
    }
    // If still empty, try to find a matching category by position or leave empty
    if (!categoryId && categories.length > 0) {
      // Fallback: use first category
      categoryId = categoryNameToId.values().next().value ?? ''
    }

    const serviceData = {
      name: svc.name,
      categoryId,
      purchasePrice: svc.purchasePrice,
      salePrice: svc.salePrice,
      defaultQuantity: svc.defaultQuantity,
      url: svc.url,
      note: svc.note,
      visible: svc.visible,
      pinned: svc.pinned ?? false,
    }

    if (existingServiceIds.has(svc.id)) {
      // Update existing service
      await updateService(svc.id, serviceData)
      updatedServices++
    } else {
      // Create new service (backend will assign a new ID)
      await createService(serviceData)
      createdServices++
    }
  }

  return { createdCategories, createdServices, updatedServices }
}

// ===== Quote API =====

function toCamelCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    street: row.street ?? undefined,
    zip: row.zip ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function toCamelProject(row: any): Project {
  const project: Project = {
    id: row.id,
    name: row.name,
    customerId: row.customer_id ?? row.customerId,
    customerName: row.customer_name ?? row.customerName,
    description: row.description,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
  if (row.customer_id && row.customer_name !== undefined) {
    project.customer = toCamelCustomer(row)
  }
  return project
}

function toCamelInvoice(row: any): Invoice {
  const invoice: Invoice = {
    id: row.id,
    invoiceNumber: row.invoice_number ?? row.invoiceNumber,
    quoteId: row.quote_id ?? row.quoteId,
    quoteNumber: row.quote_number ?? row.quoteNumber,
    projectId: row.project_id ?? row.projectId,
    projectName: row.project_name ?? row.projectName,
    customerId: row.customer_id ?? row.customerId,
    customerName: row.customer_name ?? row.customerName,
    title: row.title,
    status: row.status,
    dueDate: row.due_date ?? row.dueDate,
    paidAt: row.paid_at ?? row.paidAt,
    notes: row.notes,
    totalNet: parseFloat(row.total_net ?? row.totalNet ?? 0),
    totalGross: parseFloat(row.total_gross ?? row.totalGross ?? 0),
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
  if (row.quote_id && row.quote_number !== undefined) {
    invoice.quote = {
      id: row.quote_id,
      quoteNumber: row.quote_number,
      title: row.quote_title,
      status: row.quote_status,
      customerId: row.quote_customer_id,
      customerName: row.quote_customer_name,
      projectId: row.quote_project_id,
      projectName: row.quote_project_name,
    } as Quote
  }
  if (row.customer_id && row.customer_name !== undefined) {
    invoice.customer = toCamelCustomer(row)
  }
  if (row.project_id && row.project_name !== undefined) {
    invoice.project = toCamelProject(row)
  }
  return invoice
}

function toCamelQuote(row: any): Quote {
  const quote: Quote = {
    id: row.id,
    quoteNumber: row.quote_number ?? row.quoteNumber,
    title: row.title,
    customerName: row.customer_name ?? row.customerName,
    customerId: row.customer_id ?? row.customerId,
    projectId: row.project_id ?? row.projectId,
    projectName: row.project_name ?? row.projectName,
    status: row.status,
    discountType: row.discount_type ?? row.discountType,
    discountValue: parseFloat(row.discount_value ?? row.discountValue ?? 0),
    notes: row.notes,
    validUntil: row.valid_until ?? row.validUntil,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
  if (row.customer_id && row.customer_name !== undefined) {
    quote.customer = toCamelCustomer(row)
  }
  if (row.project_id && row.project_name !== undefined) {
    quote.project = toCamelProject(row)
  }
  return quote
}

function toCamelQuoteItem(row: any): QuoteItem {
  const item: QuoteItem = {
    id: row.id,
    quoteId: row.quote_id ?? row.quoteId,
    serviceId: row.service_id ?? row.serviceId,
    customName: row.custom_name ?? row.customName,
    customNote: row.custom_note ?? row.customNote,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price ?? row.unitPrice ?? 0),
    purchasePrice: row.purchase_price != null || row.purchasePrice != null
      ? parseFloat(row.purchase_price ?? row.purchasePrice)
      : undefined,
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
  if (row.service_id && row.service_name) {
    item.service = toCamel(row)
  }
  return item
}

export async function fetchQuotes(): Promise<Quote[]> {
  const res = await fetch(`${API_URL}/quotes`)
  if (!res.ok) throw new Error(await extractError(res, 'Angebote konnten nicht geladen werden'))
  const data = await res.json()
  return data.map(toCamelQuote)
}

export async function fetchQuotesPage(page: number, limit: number): Promise<PaginatedResponse<Quote>> {
  const res = await fetch(`${API_URL}/quotes?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error(await extractError(res, 'Angebote konnten nicht geladen werden'))
  const data = await res.json()
  return {
    data: data.data.map(toCamelQuote),
    pagination: data.pagination as PaginationMeta,
  }
}

export async function fetchQuote(id: string): Promise<QuoteWithItems> {
  const res = await fetch(`${API_URL}/quotes/${id}`)
  if (!res.ok) throw new Error(await extractError(res, 'Angebot konnte nicht geladen werden'))
  const data = await res.json()
  const quote = toCamelQuote(data) as QuoteWithItems
  quote.items = (data.items ?? []).map(toCamelQuoteItem)
  return quote
}

export async function createQuote(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quote> {
  const res = await fetch(`${API_URL}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Angebot konnte nicht erstellt werden'))
  const data = await res.json()
  return toCamelQuote(data)
}

export async function createQuoteWithItems(
  quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>,
  items: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>[],
): Promise<QuoteWithItems> {
  const res = await fetch(`${API_URL}/quotes/with-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...quote, items }),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Angebot konnte nicht erstellt werden'))
  const data = await res.json()
  const quoteWithItems = toCamelQuote(data) as QuoteWithItems
  quoteWithItems.items = (data.items ?? []).map(toCamelQuoteItem)
  return quoteWithItems
}

export async function updateQuote(id: string, patch: Partial<Quote>): Promise<Quote> {
  const res = await fetch(`${API_URL}/quotes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Angebot konnte nicht aktualisiert werden'))
  const data = await res.json()
  return toCamelQuote(data)
}

export async function deleteQuote(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/quotes/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(await extractError(res, 'Angebot konnte nicht gelöscht werden'))
}

export async function fetchQuoteStatusHistory(id: string): Promise<import('../types').QuoteStatusHistoryEntry[]> {
  const res = await fetch(`${API_URL}/quotes/${id}/history`)
  if (!res.ok) throw new Error(await extractError(res, 'Status-Historie konnte nicht geladen werden'))
  return await res.json()
}

export async function updateQuoteStatus(
  id: string,
  status: import('../types').QuoteStatus,
  changedBy?: string,
): Promise<import('../types').Quote> {
  const res = await fetch(`${API_URL}/quotes/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, changedBy }),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Status konnte nicht aktualisiert werden'))
  return await res.json()
}

export async function duplicateQuote(id: string): Promise<Quote> {
  const res = await fetch(`${API_URL}/quotes/${id}/duplicate`, { method: 'POST' })
  if (!res.ok) throw new Error(await extractError(res, 'Angebot konnte nicht dupliziert werden'))
  const data = await res.json()
  return toCamelQuote(data)
}

export async function addQuoteItem(quoteId: string, item: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>): Promise<QuoteItem> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Position konnte nicht hinzugefügt werden'))
  const data = await res.json()
  return toCamelQuoteItem(data)
}

export async function updateQuoteItem(quoteId: string, itemId: string, patch: Partial<QuoteItem>): Promise<QuoteItem> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Position konnte nicht aktualisiert werden'))
  const data = await res.json()
  return toCamelQuoteItem(data)
}

export async function deleteQuoteItem(quoteId: string, itemId: string): Promise<void> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items/${itemId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(await extractError(res, 'Position konnte nicht entfernt werden'))
}

export async function reorderQuoteItems(quoteId: string, itemIds: string[]): Promise<void> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemIds }),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Positionen konnten nicht neu sortiert werden'))
}

// ===== Dashboard API =====

export async function fetchDashboard(vatRate: number): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/dashboard?vatRate=${vatRate}`)
  if (!res.ok) throw new Error(await extractError(res, 'Dashboard-Daten konnten nicht geladen werden'))
  return res.json()
}

// ===== Project API =====

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`)
  if (!res.ok) throw new Error(await extractError(res, 'Projekte konnten nicht geladen werden'))
  const data = await res.json()
  return data.map(toCamelProject)
}

export async function fetchProjectsPage(page: number, limit: number): Promise<PaginatedResponse<Project>> {
  const res = await fetch(`${API_URL}/projects?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error(await extractError(res, 'Projekte konnten nicht geladen werden'))
  const data = await res.json()
  return {
    data: data.data.map(toCamelProject),
    pagination: data.pagination as PaginationMeta,
  }
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`${API_URL}/projects/${id}`)
  if (!res.ok) throw new Error(await extractError(res, 'Projekt konnte nicht geladen werden'))
  return toCamelProject(await res.json())
}

export interface ProjectFinances {
  quotesTotalGross: number
  invoicesTotalGross: number
  openAmount: number
  quoteCount: number
}

export async function fetchProjectQuotes(id: string): Promise<Quote[]> {
  const res = await fetch(`${API_URL}/projects/${id}/quotes`)
  if (!res.ok) throw new Error(await extractError(res, 'Angebote des Projekts konnten nicht geladen werden'))
  const data = await res.json()
  return data.map(toCamelQuote)
}

export async function fetchProjectFinances(id: string): Promise<ProjectFinances> {
  const res = await fetch(`${API_URL}/projects/${id}/finances`)
  if (!res.ok) throw new Error(await extractError(res, 'Projekt-Finanzen konnten nicht geladen werden'))
  return await res.json()
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Projekt konnte nicht erstellt werden'))
  return toCamelProject(await res.json())
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Projekt konnte nicht aktualisiert werden'))
  return toCamelProject(await res.json())
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(await extractError(res, 'Projekt konnte nicht gelöscht werden'))
}

// ===== Invoice API =====

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await fetch(`${API_URL}/invoices`)
  if (!res.ok) throw new Error(await extractError(res, 'Rechnungen konnten nicht geladen werden'))
  const data = await res.json()
  return data.map(toCamelInvoice)
}

export async function fetchInvoicesPage(page: number, limit: number): Promise<PaginatedResponse<Invoice>> {
  const res = await fetch(`${API_URL}/invoices?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error(await extractError(res, 'Rechnungen konnten nicht geladen werden'))
  const data = await res.json()
  return {
    data: data.data.map(toCamelInvoice),
    pagination: data.pagination as PaginationMeta,
  }
}

export async function fetchInvoice(id: string): Promise<InvoiceWithItems> {
  const res = await fetch(`${API_URL}/invoices/${id}`)
  if (!res.ok) throw new Error(await extractError(res, 'Rechnung konnte nicht geladen werden'))
  const data = await res.json()
  const invoice = toCamelInvoice(data) as InvoiceWithItems
  invoice.items = (data.items ?? []).map(toCamelQuoteItem)
  return invoice
}

export async function createInvoiceFromQuote(quoteId: string, vatRate: number): Promise<Invoice> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vatRate }),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Rechnung konnte nicht erstellt werden'))
  return toCamelInvoice(await res.json())
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
  const res = await fetch(`${API_URL}/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await extractError(res, 'Rechnung konnte nicht aktualisiert werden'))
  return toCamelInvoice(await res.json())
}

export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/invoices/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(await extractError(res, 'Rechnung konnte nicht gelöscht werden'))
}