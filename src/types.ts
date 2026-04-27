// ===== Domain types =====

export interface Service {
  id: string
  name: string
  category: string
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

export interface CartItem {
  serviceId: string
  quantity: number
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
}

// ===== Computation types =====

export interface LineComputation {
  service: Service
  quantity: number
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
