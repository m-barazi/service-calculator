import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Service, Settings, Category, Customer, Quote, QuoteWithItems, QuoteItem, QuoteStatusHistoryEntry, DashboardData, CartTemplate, CartItem, Project, Invoice, InvoiceWithItems, InvoiceStatus, CartEntry } from '../types'
import type { ProjectFinances } from '../lib/api'
import {
  loadCart,
  loadSettings,
  saveCart,
  saveSettings,
  loadTemplates,
  saveTemplates,
  newTemplateId,
} from '../lib/storage'
import { buildCartQuoteItems } from '../lib/cartQuote'
import {
  fetchServices,
  createService,
  updateService as updateServiceApi,
  deleteService as apiDeleteService,
  fetchCategories,
  createCategory,
  updateCategory as updateCategoryApi,
  deleteCategory as deleteCategoryApi,
  reorderCategories as reorderCategoriesApi,
  fetchCustomers,
  createCustomer,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
  fetchProjects,
  createProject as createProjectApi,
  updateProject as updateProjectApi,
  deleteProject as deleteProjectApi,
  fetchProjectQuotes,
  fetchProjectFinances,
  fetchQuotes,
  createQuote as createQuoteApi,
  createQuoteWithItems as createQuoteWithItemsApi,
  updateQuote as updateQuoteApi,
  deleteQuote as deleteQuoteApi,
  duplicateQuote as duplicateQuoteApi,
  fetchQuote as fetchQuoteApi,
  fetchQuoteStatusHistory,
  updateQuoteStatus as updateQuoteStatusApi,
  addQuoteItem as addQuoteItemApi,
  updateQuoteItem as updateQuoteItemApi,
  deleteQuoteItem as deleteQuoteItemApi,
  fetchDashboard,
  fetchInvoices,
  fetchInvoice as fetchInvoiceApi,
  createInvoiceFromQuote as createInvoiceFromQuoteApi,
  updateInvoice as updateInvoiceApi,
  deleteInvoice as deleteInvoiceApi,
} from '../lib/api'
import { useTheme } from './useTheme'
import { useToast } from './useToast'
import { formatQuoteStatus } from '../lib/format'

interface AppState {
  // Services
  services: Service[]
  isLoading: boolean
  addService: (s: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateService: (id: string, patch: Partial<Service>) => Promise<void>
  deleteService: (id: string) => Promise<void>
  refreshServices: () => Promise<void>

  // Cart (serviceId → { quantity, note, unitPrice? })
  cart: Record<string, CartEntry>
  setQuantity: (serviceId: string, quantity: number) => void
  setNote: (serviceId: string, note: string) => void
  setUnitPrice: (serviceId: string, unitPrice: number | undefined) => void
  resetCartPrice: (serviceId: string) => void
  clearCart: () => void
  undoClearCart: () => void
  canUndoClearCart: boolean
  cartItemCount: number
  cartLineCount: number

  // Cart templates
  cartTemplates: CartTemplate[]
  saveCartTemplate: (name: string) => void
  loadCartTemplate: (id: string, mode: 'replace' | 'merge') => void
  deleteCartTemplate: (id: string) => void

  // Settings
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  // Categories (loaded from API)
  categories: Category[]
  isLoadingCategories: boolean
  addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (ids: string[]) => Promise<void>
  refreshCategories: () => Promise<void>

  // Customers (loaded from API)
  customers: Customer[]
  isLoadingCustomers: boolean
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>
  updateCustomer: (id: string, patch: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  refreshCustomers: () => Promise<void>

  // Quotes (loaded from API)
  quotes: Quote[]
  isLoadingQuotes: boolean
  addQuote: (q: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Quote>
  updateQuote: (id: string, patch: Partial<Quote>) => Promise<void>
  deleteQuote: (id: string) => Promise<void>
  duplicateQuote: (id: string) => Promise<Quote>
  updateQuoteStatus: (id: string, status: import('../types').QuoteStatus) => Promise<void>
  refreshQuotes: () => Promise<void>
  fetchQuoteDetail: (id: string) => Promise<QuoteWithItems>
  fetchQuoteHistory: (id: string) => Promise<QuoteStatusHistoryEntry[]>
  addItem: (quoteId: string, item: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>) => Promise<QuoteItem>
  updateItem: (quoteId: string, itemId: string, patch: Partial<QuoteItem>) => Promise<void>
  deleteItem: (quoteId: string, itemId: string) => Promise<void>
  createQuoteFromCart: (title: string, customerId?: string, projectId?: string) => Promise<Quote>

  // Projects (loaded from API)
  projects: Project[]
  isLoadingProjects: boolean
  addProject: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  refreshProjects: () => Promise<void>
  fetchProjectQuotes: (id: string) => Promise<Quote[]>
  fetchProjectFinances: (id: string) => Promise<ProjectFinances>

  // Invoices (loaded from API)
  invoices: Invoice[]
  isLoadingInvoices: boolean
  addInvoiceFromQuote: (quoteId: string) => Promise<Invoice>
  updateInvoice: (id: string, patch: Partial<Invoice>) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  refreshInvoices: () => Promise<void>
  fetchInvoiceDetail: (id: string) => Promise<InvoiceWithItems>

  // Dashboard (loaded from API)
  dashboard: DashboardData | null
  isLoadingDashboard: boolean
  refreshDashboard: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true)
  const [cart, setCart] = useState<Record<string, CartEntry>>(() => loadCart())
  const [cartBeforeClear, setCartBeforeClear] = useState<Record<string, { quantity: number; note: string }> | null>(null)
  const clearUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cartTemplates, setCartTemplates] = useState<CartTemplate[]>(() => loadTemplates())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  // Apply theme
  useTheme(settings.theme)

  // Load services and categories from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [servicesData, categoriesData, customersData, quotesData, projectsData, invoicesData, dashboardData] = await Promise.all([
          fetchServices(),
          fetchCategories(),
          fetchCustomers(),
          fetchQuotes(),
          fetchProjects(),
          fetchInvoices(),
          fetchDashboard(settings.vatRate),
        ])
        setServices(servicesData)
        setCategories(categoriesData)
        setCustomers(customersData)
        setQuotes(quotesData)
        setProjects(projectsData)
        setInvoices(invoicesData)
        setDashboard(dashboardData)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Daten konnten nicht geladen werden'
        console.error('Failed to load data:', error)
        toast.error(message)
      } finally {
        setIsLoading(false)
        setIsLoadingCategories(false)
        setIsLoadingCustomers(false)
        setIsLoadingQuotes(false)
        setIsLoadingProjects(false)
        setIsLoadingInvoices(false)
        setIsLoadingDashboard(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  useEffect(() => {
    saveTemplates(cartTemplates)
  }, [cartTemplates])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const handleError = useCallback((error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback
    console.error(fallback, error)
    toast.error(message)
  }, [toast])

  // ---- Service operations ----
  const refreshServices = useCallback(async () => {
    try {
      const data = await fetchServices()
      setServices(data)
    } catch (error) {
      handleError(error, 'Failed to refresh services')
    }
  }, [handleError])

  const addService = useCallback(
    async (s: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createService(s)
        setServices((prev) => [...prev, created])
        toast.success('Leistung erstellt')
      } catch (error) {
        handleError(error, 'Failed to add service')
        throw error
      }
    },
    [handleError, toast],
  )

  const updateService = useCallback(async (id: string, patch: Partial<Service>) => {
    try {
      const updated = await updateServiceApi(id, patch)
      setServices((prev) =>
        prev.map((s) => (s.id === id ? updated : s)),
      )
      toast.success('Leistung aktualisiert')
    } catch (error) {
      handleError(error, 'Failed to update service')
      throw error
    }
  }, [handleError, toast])

  const deleteService = useCallback(async (id: string) => {
    try {
      await apiDeleteService(id)
      setServices((prev) => prev.filter((s) => s.id !== id))
      setCart((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success('Leistung gelöscht')
    } catch (error) {
      handleError(error, 'Failed to delete service')
      throw error
    }
  }, [handleError, toast])

  // ---- Category operations ----
  const addCategory = useCallback(
    async (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createCategory(c)
        setCategories((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)))
        toast.success('Kategorie erstellt')
      } catch (error) {
        handleError(error, 'Failed to add category')
        throw error
      }
    },
    [handleError, toast],
  )

  const updateCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    try {
      const updated = await updateCategoryApi(id, patch)
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)),
      )
      toast.success('Kategorie aktualisiert')
    } catch (error) {
      handleError(error, 'Failed to update category')
      throw error
    }
  }, [handleError, toast])

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await deleteCategoryApi(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      toast.success('Kategorie gelöscht')
    } catch (error) {
      handleError(error, 'Failed to delete category')
      throw error
    }
  }, [handleError, toast])

  const refreshCategories = useCallback(async () => {
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (error) {
      handleError(error, 'Failed to refresh categories')
    }
  }, [handleError])

  const reorderCategories = useCallback(
    async (ids: string[]) => {
      try {
        const updated = await reorderCategoriesApi(ids)
        setCategories(updated)
        toast.success('Kategorien neu sortiert')
      } catch (error) {
        handleError(error, 'Failed to reorder categories')
        throw error
      }
    },
    [handleError, toast],
  )

  // ---- Customer operations ----
  const addCustomer = useCallback(
    async (c: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createCustomer(c)
        setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Kunde erstellt')
        return created
      } catch (error) {
        handleError(error, 'Failed to add customer')
        throw error
      }
    },
    [handleError, toast],
  )

  const updateCustomer = useCallback(async (id: string, patch: Partial<Customer>) => {
    try {
      const updated = await updateCustomerApi(id, patch)
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)),
      )
      // Also update customer data in cached quotes
      setQuotes((prev) =>
        prev.map((q) => (q.customerId === id ? { ...q, customer: updated, customerName: updated.name } : q)),
      )
      toast.success('Kunde aktualisiert')
    } catch (error) {
      handleError(error, 'Failed to update customer')
      throw error
    }
  }, [handleError, toast])

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await deleteCustomerApi(id)
      setCustomers((prev) => prev.filter((c) => c.id !== id))
      toast.success('Kunde gelöscht')
    } catch (error) {
      handleError(error, 'Failed to delete customer')
      throw error
    }
  }, [handleError, toast])

  // ---- Project operations ----
  const addProject = useCallback(
    async (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createProjectApi(p)
        setProjects((prev) => [created, ...prev])
        toast.success('Projekt erstellt')
        return created
      } catch (error) {
        handleError(error, 'Failed to add project')
        throw error
      }
    },
    [handleError, toast],
  )

  const updateProject = useCallback(async (id: string, patch: Partial<Project>) => {
    try {
      const updated = await updateProjectApi(id, patch)
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updated : p)),
      )
      // Also update project data in cached quotes
      setQuotes((prev) =>
        prev.map((q) => (q.projectId === id ? { ...q, project: updated, projectName: updated.name } : q)),
      )
      toast.success('Projekt aktualisiert')
    } catch (error) {
      handleError(error, 'Failed to update project')
      throw error
    }
  }, [handleError, toast])

  const deleteProject = useCallback(async (id: string) => {
    try {
      await deleteProjectApi(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setQuotes((prev) => prev.map((q) => (q.projectId === id ? { ...q, projectId: undefined, projectName: undefined, project: undefined } : q)))
      toast.success('Projekt gelöscht')
    } catch (error) {
      handleError(error, 'Failed to delete project')
      throw error
    }
  }, [handleError, toast])

  const refreshProjects = useCallback(async () => {
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (error) {
      handleError(error, 'Failed to refresh projects')
    }
  }, [handleError])

  const fetchProjectQuotesHandler = useCallback(async (id: string) => {
    try {
      return await fetchProjectQuotes(id)
    } catch (error) {
      handleError(error, 'Failed to fetch project quotes')
      throw error
    }
  }, [handleError])

  const fetchProjectFinancesHandler = useCallback(async (id: string) => {
    try {
      return await fetchProjectFinances(id)
    } catch (error) {
      handleError(error, 'Failed to fetch project finances')
      throw error
    }
  }, [handleError])

  const refreshCustomers = useCallback(async () => {
    try {
      const data = await fetchCustomers()
      setCustomers(data)
    } catch (error) {
      handleError(error, 'Failed to refresh customers')
    }
  }, [handleError])

  const clearCart = useCallback(() => {
    setCart((prev) => {
      if (Object.keys(prev).length > 0) {
        setCartBeforeClear(prev)
        if (clearUndoTimerRef.current) clearTimeout(clearUndoTimerRef.current)
        clearUndoTimerRef.current = setTimeout(() => {
          setCartBeforeClear(null)
        }, 5000)
      }
      return {}
    })
  }, [])

  const undoClearCart = useCallback(() => {
    if (cartBeforeClear) {
      setCart(cartBeforeClear)
      setCartBeforeClear(null)
      if (clearUndoTimerRef.current) clearTimeout(clearUndoTimerRef.current)
    }
  }, [cartBeforeClear])

  // ---- Dashboard operations ----
  const refreshDashboard = useCallback(async () => {
    try {
      const data = await fetchDashboard(settings.vatRate)
      setDashboard(data)
    } catch (error) {
      handleError(error, 'Failed to refresh dashboard')
    }
  }, [settings.vatRate, handleError])

  useEffect(() => {
    refreshDashboard()
  }, [settings.vatRate, refreshDashboard])

  // ---- Invoice operations ----
  const refreshInvoices = useCallback(async () => {
    try {
      const data = await fetchInvoices()
      setInvoices(data)
    } catch (error) {
      handleError(error, 'Failed to refresh invoices')
    }
  }, [handleError])

  const fetchInvoiceDetail = useCallback(async (id: string) => {
    try {
      return await fetchInvoiceApi(id)
    } catch (error) {
      handleError(error, 'Failed to fetch invoice detail')
      throw error
    }
  }, [handleError])

  const addInvoiceFromQuote = useCallback(
    async (quoteId: string) => {
      try {
        const created = await createInvoiceFromQuoteApi(quoteId, settings.vatRate)
        setInvoices((prev) => [created, ...prev])
        toast.success('Rechnung erstellt')
        void refreshDashboard()
        return created
      } catch (error) {
        handleError(error, 'Failed to create invoice')
        throw error
      }
    },
    [handleError, toast, refreshDashboard, settings.vatRate],
  )

  const updateInvoice = useCallback(
    async (id: string, patch: Partial<Invoice>) => {
      try {
        const updated = await updateInvoiceApi(id, patch)
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)))
        toast.success('Rechnung aktualisiert')
        void refreshDashboard()
      } catch (error) {
        handleError(error, 'Failed to update invoice')
        throw error
      }
    },
    [handleError, toast, refreshDashboard],
  )

  const deleteInvoice = useCallback(
    async (id: string) => {
      try {
        await deleteInvoiceApi(id)
        setInvoices((prev) => prev.filter((inv) => inv.id !== id))
        toast.success('Rechnung gelöscht')
        void refreshDashboard()
      } catch (error) {
        handleError(error, 'Failed to delete invoice')
        throw error
      }
    },
    [handleError, toast, refreshDashboard],
  )

  // ---- Quote operations ----
  const addQuote = useCallback(
    async (q: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createQuoteApi(q)
        setQuotes((prev) => [created, ...prev])
        toast.success('Angebot erstellt')
        void refreshDashboard()
        return created
      } catch (error) {
        handleError(error, 'Failed to add quote')
        throw error
      }
    },
    [handleError, toast, refreshDashboard],
  )

  const updateQuote = useCallback(async (id: string, patch: Partial<Quote>) => {
    try {
      const updated = await updateQuoteApi(id, patch)
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)))
      void refreshDashboard()
    } catch (error) {
      handleError(error, 'Failed to update quote')
      throw error
    }
  }, [handleError, refreshDashboard])

  const deleteQuote = useCallback(async (id: string) => {
    try {
      await deleteQuoteApi(id)
      setQuotes((prev) => prev.filter((q) => q.id !== id))
      toast.success('Angebot gelöscht')
      void refreshDashboard()
    } catch (error) {
      handleError(error, 'Failed to delete quote')
      throw error
    }
  }, [handleError, toast, refreshDashboard])

  const updateQuoteStatus = useCallback(
    async (id: string, status: import('../types').QuoteStatus) => {
      try {
        const updated = await updateQuoteStatusApi(id, status)
        setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)))
        toast.success(`Status auf ${formatQuoteStatus(status)} geändert`)
        void refreshDashboard()
      } catch (error) {
        handleError(error, 'Failed to update quote status')
        throw error
      }
    },
    [handleError, toast, refreshDashboard],
  )

  const fetchQuoteHistory = useCallback(async (id: string) => {
    try {
      return await fetchQuoteStatusHistory(id)
    } catch (error) {
      handleError(error, 'Failed to fetch quote status history')
      throw error
    }
  }, [handleError])

  const duplicateQuote = useCallback(
    async (id: string) => {
      try {
        const copy = await duplicateQuoteApi(id)
        setQuotes((prev) => [copy, ...prev])
        toast.success('Angebot dupliziert')
        void refreshDashboard()
        return copy
      } catch (error) {
        handleError(error, 'Failed to duplicate quote')
        throw error
      }
    },
    [handleError, toast, refreshDashboard],
  )

  const refreshQuotes = useCallback(async () => {
    try {
      const data = await fetchQuotes()
      setQuotes(data)
    } catch (error) {
      handleError(error, 'Failed to refresh quotes')
    }
  }, [handleError])

  const fetchQuoteDetail = useCallback(async (id: string) => {
    try {
      return await fetchQuoteApi(id)
    } catch (error) {
      handleError(error, 'Failed to fetch quote detail')
      throw error
    }
  }, [handleError])

  const addItem = useCallback(
    async (quoteId: string, item: Omit<import('../types').QuoteItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await addQuoteItemApi(quoteId, item)
        void refreshDashboard()
        return created
      } catch (error) {
        handleError(error, 'Failed to add quote item')
        throw error
      }
    },
    [handleError, refreshDashboard],
  )

  const updateItem = useCallback(
    async (quoteId: string, itemId: string, patch: Partial<import('../types').QuoteItem>) => {
      try {
        await updateQuoteItemApi(quoteId, itemId, patch)
        void refreshDashboard()
      } catch (error) {
        handleError(error, 'Failed to update quote item')
        throw error
      }
    },
    [handleError, refreshDashboard],
  )

  const deleteItem = useCallback(async (quoteId: string, itemId: string) => {
    try {
      await deleteQuoteItemApi(quoteId, itemId)
      void refreshDashboard()
    } catch (error) {
      handleError(error, 'Failed to delete quote item')
      throw error
    }
  }, [handleError, refreshDashboard])

  const createQuoteFromCart = useCallback(
    async (title: string, customerId?: string, projectId?: string) => {
      try {
        const items = buildCartQuoteItems(cart, services)
        const detail = await createQuoteWithItemsApi(
          {
            title,
            customerId,
            projectId,
            status: 'draft',
            discountValue: 0,
          },
          items,
        )
        clearCart()
        setQuotes((prev) => [detail, ...prev])
        toast.success('Angebot aus Warenkorb erstellt')
        void refreshDashboard()
        return detail
      } catch (error) {
        handleError(error, 'Failed to create quote from cart')
        throw error
      }
    },
    [cart, services, createQuoteWithItemsApi, clearCart, handleError, toast, refreshDashboard],
  )

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

  const setUnitPrice = useCallback((serviceId: string, unitPrice: number | undefined) => {
    setCart((prev) => {
      const next = { ...prev }
      if (!next[serviceId]) return next
      next[serviceId] = { ...next[serviceId], unitPrice }
      return next
    })
  }, [])

  const resetCartPrice = useCallback((serviceId: string) => {
    setCart((prev) => {
      const next = { ...prev }
      if (!next[serviceId]) return next
      const { unitPrice: _removed, ...rest } = next[serviceId]
      next[serviceId] = rest
      return next
    })
  }, [])

  const canUndoClearCart = useMemo(() => cartBeforeClear !== null, [cartBeforeClear])

  // ---- Settings ----
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const cartItemCount = useMemo(
    () => Object.values(cart).reduce((s, entry) => s + entry.quantity, 0),
    [cart],
  )
  const cartLineCount = useMemo(() => Object.keys(cart).length, [cart])

  // ---- Cart template operations ----
  const saveCartTemplate = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const items: CartItem[] = Object.entries(cart).map(([serviceId, entry]) => ({
      serviceId,
      quantity: entry.quantity,
      note: entry.note,
      unitPrice: entry.unitPrice,
    }))
    const now = new Date().toISOString()
    const template: CartTemplate = {
      id: newTemplateId(),
      name: trimmed,
      items,
      createdAt: now,
      updatedAt: now,
    }
    setCartTemplates((prev) => [...prev, template].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Warenkorb-Vorlage gespeichert')
  }, [cart, toast])

  const loadCartTemplate = useCallback((id: string, mode: 'replace' | 'merge') => {
    const template = cartTemplates.find((t) => t.id === id)
    if (!template) return
    const activeIds = new Set(services.map((s) => s.id))
    const validItems = template.items.filter((i) => activeIds.has(i.serviceId))
    if (validItems.length === 0) {
      toast.error('Vorlage enthält keine gültigen Leistungen mehr')
      return
    }
    const next: Record<string, CartEntry> =
      mode === 'replace' ? {} : { ...cart }
    for (const item of validItems) {
      next[item.serviceId] = {
        quantity: Math.max(1, item.quantity),
        note: item.note ?? '',
        unitPrice: item.unitPrice,
      }
    }
    setCart(next)
    toast.success(mode === 'replace' ? 'Vorlage geladen' : 'Vorlage zum Warenkorb hinzugefügt')
  }, [cartTemplates, services, cart, toast])

  const deleteCartTemplate = useCallback((id: string) => {
    setCartTemplates((prev) => prev.filter((t) => t.id !== id))
    toast.success('Vorlage gelöscht')
  }, [toast])

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
      setUnitPrice,
      resetCartPrice,
      clearCart,
      undoClearCart,
      canUndoClearCart,
      cartItemCount,
      cartLineCount,
      cartTemplates,
      saveCartTemplate,
      loadCartTemplate,
      deleteCartTemplate,
      settings,
      updateSettings,
      categories,
      isLoadingCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      reorderCategories,
      refreshCategories,
      customers,
      isLoadingCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      refreshCustomers,
      quotes,
      isLoadingQuotes,
      addQuote,
      updateQuote,
      deleteQuote,
      duplicateQuote,
      updateQuoteStatus,
      fetchQuoteHistory,
      refreshQuotes,
      fetchQuoteDetail,
      addItem,
      updateItem,
      deleteItem,
      createQuoteFromCart,
      projects,
      isLoadingProjects,
      addProject,
      updateProject,
      deleteProject,
      refreshProjects,
      fetchProjectQuotes: fetchProjectQuotesHandler,
      fetchProjectFinances: fetchProjectFinancesHandler,
      invoices,
      isLoadingInvoices,
      addInvoiceFromQuote,
      updateInvoice,
      deleteInvoice,
      refreshInvoices,
      fetchInvoiceDetail,
      dashboard,
      isLoadingDashboard,
      refreshDashboard,
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
      setUnitPrice,
      resetCartPrice,
      clearCart,
      undoClearCart,
      canUndoClearCart,
      updateSettings,
      cartItemCount,
      cartLineCount,
      cartTemplates,
      saveCartTemplate,
      loadCartTemplate,
      deleteCartTemplate,
      categories,
      isLoadingCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      reorderCategories,
      refreshCategories,
      customers,
      isLoadingCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      refreshCustomers,
      quotes,
      isLoadingQuotes,
      addQuote,
      updateQuote,
      deleteQuote,
      duplicateQuote,
      updateQuoteStatus,
      fetchQuoteHistory,
      refreshQuotes,
      fetchQuoteDetail,
      addItem,
      updateItem,
      deleteItem,
      createQuoteFromCart,
      projects,
      isLoadingProjects,
      addProject,
      updateProject,
      deleteProject,
      refreshProjects,
      fetchProjectQuotesHandler,
      invoices,
      isLoadingInvoices,
      addInvoiceFromQuote,
      updateInvoice,
      deleteInvoice,
      refreshInvoices,
      fetchInvoiceDetail,
      dashboard,
      isLoadingDashboard,
      refreshDashboard,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
