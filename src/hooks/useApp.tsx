import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Service, Settings, Category } from '../types'
import {
  loadCart,
  loadSettings,
  saveCart,
  saveSettings,
} from '../lib/storage'
import {
  fetchServices,
  createService,
  updateService as updateServiceApi,
  deleteService as apiDeleteService,
  fetchCategories,
  createCategory,
  updateCategory as updateCategoryApi,
  deleteCategory as deleteCategoryApi,
} from '../lib/api'
import { useTheme } from './useTheme'

interface AppState {
  // Services
  services: Service[]
  isLoading: boolean
  addService: (s: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateService: (id: string, patch: Partial<Service>) => Promise<void>
  deleteService: (id: string) => Promise<void>
  refreshServices: () => Promise<void>

  // Cart (serviceId → quantity)
  cart: Record<string, number>
  setQuantity: (serviceId: string, quantity: number) => void
  clearCart: () => void
  cartItemCount: number
  cartLineCount: number

  // Settings
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  // Categories (loaded from API)
  categories: Category[]
  isLoadingCategories: boolean
  addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  refreshCategories: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [cart, setCart] = useState<Record<string, number>>(() => loadCart())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  // Apply theme
  useTheme(settings.theme)

  // Load services and categories from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [servicesData, categoriesData] = await Promise.all([
          fetchServices(),
          fetchCategories(),
        ])
        setServices(servicesData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
        setIsLoadingCategories(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // ---- Service operations ----
  const refreshServices = useCallback(async () => {
    try {
      const data = await fetchServices()
      setServices(data)
    } catch (error) {
      console.error('Failed to refresh services:', error)
    }
  }, [])

  const addService = useCallback(
    async (s: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
      const created = await createService(s)
      setServices((prev) => [...prev, created])
    },
    [],
  )

  const updateService = useCallback(async (id: string, patch: Partial<Service>) => {
    const updated = await updateServiceApi(id, patch)
    setServices((prev) =>
      prev.map((s) => (s.id === id ? updated : s)),
    )
  }, [])

  const deleteService = useCallback(async (id: string) => {
    await apiDeleteService(id)
    setServices((prev) => prev.filter((s) => s.id !== id))
    setCart((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // ---- Category operations ----
  const addCategory = useCallback(
    async (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
      const created = await createCategory(c)
      setCategories((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)))
    },
    [],
  )

  const updateCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    const updated = await updateCategoryApi(id, patch)
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? updated : c)),
    )
  }, [])

  const deleteCategory = useCallback(async (id: string) => {
    await deleteCategoryApi(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const refreshCategories = useCallback(async () => {
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to refresh categories:', error)
    }
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

  const value = useMemo<AppState>(
    () => ({
      services,
      isLoading,
      addService,
      updateService,
      deleteService,
      refreshServices,
      cart,
      setQuantity,
      clearCart,
      cartItemCount,
      cartLineCount,
      settings,
      updateSettings,
      categories,
      isLoadingCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      refreshCategories,
    }),
    [
      services,
      isLoading,
      cart,
      settings,
      addService,
      updateService,
      deleteService,
      refreshServices,
      setQuantity,
      clearCart,
      updateSettings,
      cartItemCount,
      cartLineCount,
      categories,
      isLoadingCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      refreshCategories,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
