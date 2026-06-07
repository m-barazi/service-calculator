import type { Category, Service, Settings } from '../types'

const KEYS = {
  settings: 'sc.settings.v1',
  cart: 'sc.cart.v1',
} as const

const DEFAULT_SETTINGS: Settings = {
  vatRate: 0.19,
  companyName: 'Mein Unternehmen',
  companyTagline: 'Dienstleistungen & Print',
  theme: 'system',
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

export function loadCart(): Record<string, { quantity: number; note: string }> {
  try {
    const raw = localStorage.getItem(KEYS.cart)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Migrate from old format (quantity-only) to new format
    const result: Record<string, { quantity: number; note: string }> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number') {
        // Old format: { serviceId: quantity }
        result[key] = { quantity: value, note: '' }
      } else if (typeof value === 'object' && value !== null) {
        // New format: { serviceId: { quantity, note } }
        result[key] = {
          quantity: (value as any).quantity ?? 0,
          note: (value as any).note ?? '',
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function saveCart(cart: Record<string, { quantity: number; note: string }>): void {
  try {
    localStorage.setItem(KEYS.cart, JSON.stringify(cart))
  } catch {
    /* no-op */
  }
}

// ===== Export / Import (backup via API) =====

export interface BackupPayload {
  version: 2
  exportedAt: string
  services: Service[]
  categories: Category[]
  settings: Settings
}

/** Legacy format (version 1) — category was a string, no categories array */
export interface BackupPayloadV1 {
  version: 1
  exportedAt: string
  services: (Service & { category?: string })[]
  settings: Settings
}

export function buildBackup(
  services: Service[],
  categories: Category[],
  settings: Settings,
): BackupPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    services,
    categories,
    settings,
  }
}

export function parseBackup(raw: unknown): BackupPayload {
  const data = raw as BackupPayloadV1 | BackupPayload

  if (data.version === 2) {
    return data as BackupPayload
  }

  if (data.version === 1) {
    // Migrate: category string → categoryId (empty, will be resolved during import)
    const migrated: BackupPayload = {
      version: 2,
      exportedAt: data.exportedAt,
      settings: data.settings,
      categories: [],
      services: (data as BackupPayloadV1).services.map((s) => {
        const { category, ...rest } = s
        return { ...rest, categoryId: '' } as Service
      }),
    }
    return migrated
  }

  throw new Error('Nicht unterstützte Backup-Version')
}

// ===== ID helper =====

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
