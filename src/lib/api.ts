import type { Service } from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch(`${API_URL}/services`)
  if (!res.ok) throw new Error('Failed to fetch services')
  return res.json()
}

export async function createService(service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
  const res = await fetch(`${API_URL}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  })
  if (!res.ok) throw new Error('Failed to create service')
  return res.json()
}

export async function updateService(id: string, patch: Partial<Service>): Promise<Service> {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to update service')
  return res.json()
}

export async function deleteService(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete service')
}
