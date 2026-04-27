import type { Service, Settings } from '../types'
import { seedServices } from '../data/seedServices'

const KEYS = {
  services: 'sc.services.v1',
  settings: 'sc.settings.v1',
  cart: 'sc.cart.v1',
} as const

const DEFAULT_SETTINGS: Settings = {
  vatRate: 0.19,
  companyName: 'Mein Unternehmen',
  companyTagline: 'Dienstleistungen & Print',
  theme: 'system',
}

// ===== Services =====

export function loadServices(): Service[] {
  try {
    const raw = localStorage.getItem(KEYS.services)
    if (!raw) {
      // First run — seed from CSV import
      saveServices(seedServices)
      return seedServices
    }
    const parsed = JSON.parse(raw) as Service[]
    if (!Array.isArray(parsed)) return seedServices
    return parsed
  } catch (e) {
    console.error('Failed to load services', e)
    return seedServices
  }
}

export function saveServices(services: Service[]): void {
  try {
    localStorage.setItem(KEYS.services, JSON.stringify(services))
  } catch (e) {
    console.error('Failed to save services', e)
  }
}

// ===== Settings =====

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEYS.settings)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings', e)
  }
}

// ===== Cart =====

export function loadCart(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEYS.cart)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

export function saveCart(cart: Record<string, number>): void {
  try {
    localStorage.setItem(KEYS.cart, JSON.stringify(cart))
  } catch {
    /* no-op */
  }
}

// ===== Export / Import (manual backup) =====

export interface BackupPayload {
  version: 1
  exportedAt: string
  services: Service[]
  settings: Settings
}

export function exportAll(): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    services: loadServices(),
    settings: loadSettings(),
  }
}

export function importAll(data: BackupPayload): void {
  if (data.version !== 1) throw new Error('Unsupported backup version')
  saveServices(data.services)
  saveSettings(data.settings)
}

// ===== ID helper =====

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
