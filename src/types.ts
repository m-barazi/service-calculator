// ===== Domain types =====

export interface Service {
  id: string
  name: string
  categoryId: string
  /** Einkaufspreis netto — what the company pays for one unit */
  purchasePrice: number
  /** Verkaufspreis netto — what the company charges per unit */
  salePrice: number
  /** Default quantity to suggest in calculator */
  defaultQuantity: number
  /** Optional URL to source / supplier */
  url?: string
  /** Free-form note (e.g. dimensions, material specs) */
  note?: string
  /** Whether this service is visible by default in the calculator */
  visible: boolean
  createdAt: number | string
  updatedAt: number | string
}

export interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  sortOrder: number
  visible: boolean
  createdAt: number | string
  updatedAt: number | string
}

export interface CartItem {
  serviceId: string
  quantity: number
  note: string
}

export interface Settings {
  /** VAT rate as decimal, e.g. 0.19 for 19% */
  vatRate: number
  /** Company info shown on PDF reports */
  companyName: string
  companyTagline: string
  /** Default theme — 'system' follows OS preference */
  theme: 'light' | 'dark' | 'system'
  /** Optional accent color override (CSS color) - reserved for future use */
  accent?: string
  /** Optional company logo as Base64 data URL */
  companyLogo?: string
}

// ===== Computation types =====

export interface LineComputation {
  service: Service
  quantity: number
  note: string
  /** purchasePrice * quantity */
  totalCostNet: number
  totalCostGross: number
  /** salePrice * quantity */
  totalSaleNet: number
  totalSaleGross: number
  profitNet: number
  profitMarginPct: number
}

export interface CartTotals {
  lines: LineComputation[]
  totalCostNet: number
  totalCostGross: number
  totalSaleNet: number
  totalSaleGross: number
  profitNet: number
  profitMarginPct: number
  itemCount: number
  vatRate: number
}

// ===== Quote types =====

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'
export type DiscountType = 'percent' | 'amount'

export interface Quote {
  id: string
  title: string
  customerName?: string
  status: QuoteStatus
  discountType?: DiscountType
  discountValue: number
  notes?: string
  validUntil?: string
  createdAt: string
  updatedAt: string
}

export interface QuoteItem {
  id: string
  quoteId: string
  serviceId?: string
  customName?: string
  customNote?: string
  quantity: number
  unitPrice: number
  sortOrder: number
  createdAt: string
  updatedAt: string
  service?: Service
}

export interface QuoteWithItems extends Quote {
  items: QuoteItem[]
}

export interface QuoteTotals {
  subtotalNet: number
  discountAmount: number
  totalNet: number
  vatAmount: number
  totalGross: number
  lines: QuoteLineComputation[]
}

export interface QuoteLineComputation {
  item: QuoteItem
  service?: Service
  lineNet: number
  lineGross: number
}
