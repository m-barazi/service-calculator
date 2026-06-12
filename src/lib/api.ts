/// <reference types="vite/client" />
import type { Service, Category, Quote, QuoteItem, QuoteWithItems } from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

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
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch(`${API_URL}/services`)
  if (!res.ok) throw new Error('Failed to fetch services')
  const data = await res.json()
  return data.map(toCamel)
}

export async function createService(service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
  const res = await fetch(`${API_URL}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  })
  if (!res.ok) throw new Error('Failed to create service')
  const data = await res.json()
  return toCamel(data)
}

export async function updateService(id: string, patch: Partial<Service>): Promise<Service> {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to update service')
  const data = await res.json()
  return toCamel(data)
}

export async function deleteService(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete service')
}

// ===== Category API =====

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
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

function toCamelQuote(row: any): Quote {
  return {
    id: row.id,
    title: row.title,
    customerName: row.customer_name ?? row.customerName,
    status: row.status,
    discountType: row.discount_type ?? row.discountType,
    discountValue: parseFloat(row.discount_value ?? row.discountValue ?? 0),
    notes: row.notes,
    validUntil: row.valid_until ?? row.validUntil,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
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
  if (!res.ok) throw new Error('Failed to fetch quotes')
  const data = await res.json()
  return data.map(toCamelQuote)
}

export async function fetchQuote(id: string): Promise<QuoteWithItems> {
  const res = await fetch(`${API_URL}/quotes/${id}`)
  if (!res.ok) throw new Error('Failed to fetch quote')
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
  if (!res.ok) throw new Error('Failed to create quote')
  const data = await res.json()
  return toCamelQuote(data)
}

export async function updateQuote(id: string, patch: Partial<Quote>): Promise<Quote> {
  const res = await fetch(`${API_URL}/quotes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to update quote')
  const data = await res.json()
  return toCamelQuote(data)
}

export async function deleteQuote(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/quotes/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete quote')
}

export async function addQuoteItem(quoteId: string, item: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>): Promise<QuoteItem> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) throw new Error('Failed to add quote item')
  const data = await res.json()
  return toCamelQuoteItem(data)
}

export async function updateQuoteItem(quoteId: string, itemId: string, patch: Partial<QuoteItem>): Promise<QuoteItem> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to update quote item')
  const data = await res.json()
  return toCamelQuoteItem(data)
}

export async function deleteQuoteItem(quoteId: string, itemId: string): Promise<void> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items/${itemId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete quote item')
}

export async function reorderQuoteItems(quoteId: string, itemIds: string[]): Promise<void> {
  const res = await fetch(`${API_URL}/quotes/${quoteId}/items/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemIds }),
  })
  if (!res.ok) throw new Error('Failed to reorder items')
}