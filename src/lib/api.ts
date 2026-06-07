/// <reference types="vite/client" />
import type { Service, Category } from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function toCamel(row: any): Service {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
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