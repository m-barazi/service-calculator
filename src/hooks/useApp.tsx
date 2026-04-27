import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Service, Settings } from '../types'
import {
  loadCart,
  loadServices,
  loadSettings,
  newId,
  saveCart,
  saveServices,
  saveSettings,
} from '../lib/storage'
import { useTheme } from './useTheme'

interface AppState {
  // Services
  services: Service[]
  addService: (s: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateService: (id: string, patch: Partial<Service>) => void
  deleteService: (id: string) => void

  // Cart (serviceId → quantity)
  cart: Record<string, number>
  setQuantity: (serviceId: string, quantity: number) => void
  clearCart: () => void
  cartItemCount: number
  cartLineCount: number

  // Settings
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  // Categories (derived)
  categories: string[]
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>(() => loadServices())
  const [cart, setCart] = useState<Record<string, number>>(() => loadCart())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  // Apply theme
  useTheme(settings.theme)

  // Persist services
  useEffect(() => {
    saveServices(services)
  }, [services])

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // ---- Service operations ----
  const addService = useCallback(
    (s: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      setServices((prev) => [
        ...prev,
        { ...s, id: newId(), createdAt: now, updatedAt: now },
      ])
    },
    [],
  )

  const updateService = useCallback((id: string, patch: Partial<Service>) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
      ),
    )
  }, [])

  const deleteService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
    setCart((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // ---- Cart operations ----
  const setQuantity = useCallback((serviceId: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev }
      const q = Math.max(0, Math.floor(quantity))
      if (q <= 0) delete next[serviceId]
      else next[serviceId] = q
      return next
    })
  }, [])

  const clearCart = useCallback(() => setCart({}), [])

  // ---- Settings ----
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const cartItemCount = useMemo(
    () => Object.values(cart).reduce((s, q) => s + q, 0),
    [cart],
  )
  const cartLineCount = useMemo(() => Object.keys(cart).length, [cart])

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean))
    return Array.from(set).sort()
  }, [services])

  const value = useMemo<AppState>(
    () => ({
      services,
      addService,
      updateService,
      deleteService,
      cart,
      setQuantity,
      clearCart,
      cartItemCount,
      cartLineCount,
      settings,
      updateSettings,
      categories,
    }),
    [
      services,
      cart,
      settings,
      addService,
      updateService,
      deleteService,
      setQuantity,
      clearCart,
      updateSettings,
      cartItemCount,
      cartLineCount,
      categories,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
