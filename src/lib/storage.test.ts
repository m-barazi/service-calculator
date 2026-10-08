import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadTemplates,
  saveTemplates,
  loadCart,
  saveCart,
  newTemplateId,
} from './storage'
import type { CartTemplate } from '../types'

const TEMPLATES_KEY = 'sc.templates.v1'

function withMockStorage(runner: (store: Record<string, string>) => void) {
  const original = globalThis.localStorage
  const store: Record<string, string> = {}
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach((k) => { delete store[k] }) },
    },
    configurable: true,
  })

  try {
    runner(store)
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      configurable: true,
    })
  }
}

describe('Cart templates', () => {
  beforeEach(() => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      },
      configurable: true,
    })
    afterEach(() => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
      })
    })
  })

  it('returns an empty array when nothing is stored', () => {
    expect(loadTemplates()).toEqual([])
  })

  it('round-trips templates through localStorage', () => {
    withMockStorage((store) => {
      const templates: CartTemplate[] = [
        {
          id: newTemplateId(),
          name: 'Starterpaket Web',
          items: [{ serviceId: 's-1', quantity: 2, note: 'Homepage' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      saveTemplates(templates)

      expect(store[TEMPLATES_KEY]).toEqual(JSON.stringify(templates))
      expect(loadTemplates()).toEqual(templates)
    })
  })

  it('returns an empty array for invalid localStorage data', () => {
    withMockStorage(() => {
      globalThis.localStorage.setItem(TEMPLATES_KEY, '{}')
      expect(loadTemplates()).toEqual([])
    })
  })

  it('generates unique template ids', () => {
    const ids = new Set(Array.from({ length: 20 }, newTemplateId))
    expect(ids.size).toBe(20)
  })

  it('keeps cart storage independent from templates', () => {
    withMockStorage((store) => {
      saveCart({ 's-1': { quantity: 3, note: '' } })
      saveTemplates([])

      expect(store['sc.cart.v1']).toEqual(JSON.stringify({ 's-1': { quantity: 3, note: '' } }))
      expect(store[TEMPLATES_KEY]).toEqual(JSON.stringify([]))
    })
  })
})
