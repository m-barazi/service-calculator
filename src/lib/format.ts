// German locale formatting helpers

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pctFormatter = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const numFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatEUR(value: number): string {
  if (!isFinite(value)) return '—'
  return eurFormatter.format(value)
}

export function formatNumber(value: number): string {
  if (!isFinite(value)) return '—'
  return numFormatter.format(value)
}

export function formatPct(value: number): string {
  if (!isFinite(value)) return '—'
  return pctFormatter.format(value)
}

export function formatDate(value: Date | number | string): string {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: Date | number | string): string {
  return dateTimeFormatter.format(new Date(value))
}

/** Parse German number string like "1.234,56 €" → 1234.56 */
export function parseGermanNumber(input: string): number {
  if (!input) return 0
  const cleaned = input
    .replace(/[€\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}
