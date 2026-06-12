import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Service, Settings, Category, Quote, QuoteWithItems } from '../types'
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
  fetchQuotes,
  createQuote as createQuoteApi,
  updateQuote as updateQuoteApi,
  deleteQuote as deleteQuoteApi,
  fetchQuote as fetchQuoteApi,
  addQuoteItem as addQuoteItemApi,
  updateQuoteItem as updateQuoteItemApi,
  deleteQuoteItem as deleteQuoteItemApi,
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

  // Cart (serviceId → { quantity, note })
  cart: Record<string, { quantity: number; note: string }>
  setQuantity: (serviceId: string, quantity: number) => void
  setNote: (serviceId: string, note: string) => void
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

  // Quotes (loaded from API)
  quotes: Quote[]
  isLoadingQuotes: boolean
  addQuote: (q: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Quote>
  updateQuote: (id: string, patch: Partial<Quote>) => Promise<void>
  deleteQuote: (id: string) => Promise<void>
  refreshQuotes: () => Promise<void>
  fetchQuoteDetail: (id: string) => Promise<QuoteWithItems>
  addItem: (quoteId: string, item: Omit<import('../types').QuoteItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>) => Promise<import('../types').QuoteItem>
  updateItem: (quoteId: string, itemId: string, patch: Partial<import('../types').QuoteItem>) => Promise<void>
  deleteItem: (quoteId: string, itemId: string) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
  const [cart, setCart] = useState<Record<string, { quantity: number; note: string }>>(() => loadCart())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  // Apply theme
  useTheme(settings.theme)

  // Load services and categories from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [servicesData, categoriesData, quotesData] = await Promise.all([
          fetchServices(),
          fetchCategories(),
          fetchQuotes(),
        ])
        setServices(servicesData)
        setCategories(categoriesData)
        setQuotes(quotesData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
        setIsLoadingCategories(false)
        setIsLoadingQuotes(false)
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

  // ---- Quote operations ----
  const addQuote = useCallback(
    async (q: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => {
      const created = await createQuoteApi(q)
      setQuotes((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const updateQuote = useCallback(async (id: string, patch: Partial<Quote>) => {
    const updated = await updateQuoteApi(id, patch)
    setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)))
  }, [])

  const deleteQuote = useCallback(async (id: string) => {
    await deleteQuoteApi(id)
    setQuotes((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const refreshQuotes = useCallback(async () => {
    try {
      const data = await fetchQuotes()
      setQuotes(data)
    } catch (error) {
      console.error('Failed to refresh quotes:', error)
    }
  }, [])

  const fetchQuoteDetail = useCallback(async (id: string) => {
    return await fetchQuoteApi(id)
  }, [])

  const addItem = useCallback(
    async (quoteId: string, item: Omit<import('../types').QuoteItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>) => {
      return await addQuoteItemApi(quoteId, item)
    },
    [],
  )

  const updateItem = useCallback(
    async (quoteId: string, itemId: string, patch: Partial<import('../types').QuoteItem>) => {
      await updateQuoteItemApi(quoteId, itemId, patch)
    },
    [],
  )

  const deleteItem = useCallback(async (quoteId: string, itemId: string) => {
    await deleteQuoteItemApi(quoteId, itemId)
  }, [])

  // ---- Cart operations ----
  const setQuantity = useCallback((serviceId: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev }
      const q = Math.max(0, Math.floor(quantity))
      if (q <= 0) delete next[serviceId]
      else next[serviceId] = { quantity: q, note: prev[serviceId]?.note ?? '' }
      return next
    })
  }, [])

  const setNote = useCallback((serviceId: string, note: string) => {
    setCart((prev) => {
      const next = { ...prev }
      if (next[serviceId]) {
        next[serviceId] = { ...next[serviceId], note }
      }
      return next
    })
  }, [])

  const clearCart = useCallback(() => setCart({}), [])

  // ---- Settings ----
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const cartItemCount = useMemo(
    () => Object.values(cart).reduce((s, entry) => s + entry.quantity, 0),
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
      setNote,
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
      quotes,
      isLoadingQuotes,
      addQuote,
      updateQuote,
      deleteQuote,
      refreshQuotes,
      fetchQuoteDetail,
      addItem,
      updateItem,
      deleteItem,
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
      setNote,
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
      quotes,
      isLoadingQuotes,
      addQuote,
      updateQuote,
      deleteQuote,
      refreshQuotes,
      fetchQuoteDetail,
      addItem,
      updateItem,
      deleteItem,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
