import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { QuoteWithItems, QuoteTotals, Settings } from '../types'
import { formatDate, formatEUR, formatPct } from './format'

// ── Options ────────────────────────────────────────────────────────────────

export interface QuotePdfOptions {
  mode: 'customer' | 'internal'
  customerName?: string
  projectTitle?: string
  notes?: string
  showProfit: boolean // only used for internal mode
}

// ── Visual constants (same as pdf.ts) ─────────────────────────────────────

const ACCENT: [number, number, number] = [5, 150, 105] // emerald-600
const INK: [number, number, number] = [23, 23, 23]
const INK_SOFT: [number, number, number] = [82, 82, 82]
const INK_MUTED: [number, number, number] = [140, 140, 140]
const BORDER: [number, number, number] = [228, 228, 228]
const SOFT_BG: [number, number, number] = [250, 250, 249]

// ── Vector logo (same as pdf.ts) ───────────────────────────────────────────

function drawVectorLogo(
  doc: jsPDF,
  markX: number,
  markY: number,
  markSize: number,
  INK: [number, number, number],
  ACCENT: [number, number, number],
) {
  doc.setFillColor(INK[0], INK[1], INK[2])
  doc.roundedRect(markX, markY, markSize, markSize, 8, 8, 'F')
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.setLineWidth(2.5)
  doc.setLineCap('round')
  doc.line(markX + 9, markY + 12, markX + 28, markY + 12)
  doc.line(markX + 9, markY + 18, markX + 24, markY + 18)
  doc.line(markX + 9, markY + 24, markX + 19, markY + 24)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function itemName(item: QuoteWithItems['items'][number]): string {
  if (item.customName && item.customName.trim()) return item.customName.trim()
  if (item.service) return item.service.name
  return '—'
}

function discountLabel(quote: QuoteWithItems): string {
  if (quote.discountType === 'percent') {
    return `Rabatt (-${quote.discountValue}%)`
  }
  return 'Rabatt'
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateQuotePdf(
  quote: QuoteWithItems,
  totals: QuoteTotals,
  settings: Settings,
  opts: QuotePdfOptions,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 48 // outer margin
  let y = M

  const isInternal = opts.mode === 'internal'
  const vatRate = settings.vatRate

  // ---- HEADER -----------------------------------------------
  const markX = M
  const markY = y
  const markSize = 36
  if (settings.companyLogo) {
    try {
      doc.addImage(settings.companyLogo, 'PNG', markX, markY, markSize, markSize)
    } catch {
      drawVectorLogo(doc, markX, markY, markSize, INK, ACCENT)
    }
  } else {
    drawVectorLogo(doc, markX, markY, markSize, INK, ACCENT)
  }

  // Company name & tagline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(settings.companyName, markX + markSize + 14, markY + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(INK_MUTED[0], INK_MUTED[1], INK_MUTED[2])
  doc.text(settings.companyTagline, markX + markSize + 14, markY + 30)

  // Right-aligned meta
  doc.setFontSize(8.5)
  doc.setTextColor(INK_MUTED[0], INK_MUTED[1], INK_MUTED[2])
  const metaRightX = pageW - M
  doc.text('ANGEBOT', metaRightX, markY + 6, { align: 'right' })
  doc.setFontSize(9.5)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(formatDate(new Date()), metaRightX, markY + 22, { align: 'right' })

  y = markY + markSize + 32

  // ---- TITLE ROW --------------------------------------------
  const titleText = isInternal ? `${quote.title} (INTERN)` : quote.title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(titleText, M, y)
  y += 12

  // Customer line
  const customerName = opts.customerName || quote.customerName
  if (customerName) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2])
    doc.text(`Kunde: ${customerName}`, M, y + 14)
    y += 22
  } else {
    y += 8
  }

  // Valid until
  if (quote.validUntil) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2])
    doc.text(`Gültig bis: ${formatDate(quote.validUntil)}`, M, y)
    y += 18
  }

  // Divider
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.setLineWidth(0.5)
  doc.line(M, y, pageW - M, y)
  y += 18

  // ---- TABLE ------------------------------------------------
  if (isInternal) {
    buildInternalTable(doc, quote, totals, y, M, vatRate)
  } else {
    buildCustomerTable(doc, quote, totals, y, M, vatRate)
  }

  // @ts-expect-error lastAutoTable is added by the plugin
  let yAfterTable: number = doc.lastAutoTable.finalY + 28

  // ---- TOTALS BOX -------------------------------------------
  if (yAfterTable > pageH - 280) {
    doc.addPage()
    yAfterTable = M
  }

  const boxX = pageW - M - 280
  const boxW = 280
  let boxY = yAfterTable

  const drawTotalRow = (
    label: string,
    value: string,
    rowOpts?: { strong?: boolean; accent?: boolean },
  ) => {
    if (rowOpts?.strong || rowOpts?.accent) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
    }
    if (rowOpts?.accent) {
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
    } else if (rowOpts?.strong) {
      doc.setTextColor(INK[0], INK[1], INK[2])
    } else {
      doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2])
    }
    doc.text(label, boxX + 14, boxY + 4)
    doc.text(value, boxX + boxW - 14, boxY + 4, { align: 'right' })
    boxY += 18
  }

  // Calculate box height
  const hasDiscount = totals.discountAmount > 0
  const baseRows = 2 // Zwischensumme + MwSt
  const discountRows = hasDiscount ? 1 : 0
  const totalRows = 1 // Gesamt (Brutto)
  const internalProfitRows = isInternal && opts.showProfit ? 3 : 0 // Kosten Netto/Brutto + Gewinn
  const totalRowCount = baseRows + discountRows + totalRows + internalProfitRows
  const boxHeight = 18 + totalRowCount * 18 + (isInternal && opts.showProfit ? 6 : 0)

  // Subtle background for totals
  doc.setFillColor(SOFT_BG[0], SOFT_BG[1], SOFT_BG[2])
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.roundedRect(boxX, boxY, boxW, boxHeight, 10, 10, 'FD')
  boxY += 18

  drawTotalRow('Zwischensumme (Netto)', formatEUR(totals.subtotalNet))

  if (hasDiscount) {
    drawTotalRow(discountLabel(quote), formatEUR(-totals.discountAmount))
  }

  drawTotalRow(
    `MwSt (${(vatRate * 100).toFixed(0).replace('.', ',')}%)`,
    formatEUR(totals.vatAmount),
  )

  // Divider line in box
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.line(boxX + 14, boxY - 6, boxX + boxW - 14, boxY - 6)
  drawTotalRow('Gesamt (Brutto)', formatEUR(totals.totalGross), { strong: true })

  if (isInternal && opts.showProfit) {
    boxY += 6
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.line(boxX + 14, boxY - 6, boxX + boxW - 14, boxY - 6)

    // Calculate internal totals from lines
    let totalCostNet = 0
    let totalCostGross = 0
    for (const l of totals.lines) {
      const purchasePrice = l.service ? l.service.purchasePrice : 0
      totalCostNet += purchasePrice * l.item.quantity
      totalCostGross += purchasePrice * (1 + vatRate) * l.item.quantity
    }
    const profitNet = totals.totalNet - totalCostNet
    const profitMarginPct = totals.totalNet > 0 ? profitNet / totals.totalNet : 0

    drawTotalRow('Kosten (Netto)', formatEUR(totalCostNet))
    drawTotalRow('Kosten (Brutto)', formatEUR(totalCostGross))
    drawTotalRow(
      `Gewinn (${formatPct(profitMarginPct)})`,
      formatEUR(profitNet),
      { accent: true },
    )
  }

  // ---- NOTES ------------------------------------------------
  const notes = opts.notes || quote.notes
  if (notes && notes.trim()) {
    let notesY = yAfterTable
    const notesW = pageW - M * 2 - boxW - 24
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(INK_MUTED[0], INK_MUTED[1], INK_MUTED[2])
    doc.text('NOTIZEN', M, notesY)
    notesY += 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2])
    const split = doc.splitTextToSize(notes, notesW)
    doc.text(split, M, notesY)
  }

  // ---- FOOTER -----------------------------------------------
  const footerY = pageH - 28
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.line(M, footerY - 12, pageW - M, footerY - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(INK_MUTED[0], INK_MUTED[1], INK_MUTED[2])
  const footerLabel = isInternal
    ? `${settings.companyName} · Erstellt mit Kostenrechner (INTERN) · ${formatDate(new Date())}`
    : `${settings.companyName} · Erstellt mit Kostenrechner · ${formatDate(new Date())}`
  doc.text(footerLabel, M, footerY)
  doc.text('Seite 1', pageW - M, footerY, { align: 'right' })

  // ---- SAVE -------------------------------------------------
  const safeName = (quote.title || 'Angebot')
    .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  const suffix = isInternal ? 'Intern' : 'Angebot'
  const dateStamp = new Date().toISOString().slice(0, 10)
  const filename = `${safeName || 'Angebot'}_${dateStamp}_${suffix}.pdf`

  doc.save(filename)
}

// ── Customer table ─────────────────────────────────────────────────────────

function buildCustomerTable(
  doc: jsPDF,
  quote: QuoteWithItems,
  totals: QuoteTotals,
  startY: number,
  M: number,
  vatRate: number,
): void {
  const rows: (string | { content: string; styles: Record<string, unknown> })[][] = []

  for (const l of totals.lines) {
    const name = itemName(l.item)
    const nameCell =
      l.item.customNote && l.item.customNote.trim()
        ? { content: `${name}\n${l.item.customNote}`, styles: { fontStyle: 'normal' } }
        : name

    rows.push([
      nameCell,
      String(l.item.quantity),
      formatEUR(l.item.unitPrice),
      formatEUR(l.lineNet),
      formatEUR(l.lineGross),
    ])
  }

  // Discount row
  if (totals.discountAmount > 0) {
    rows.push([
      discountLabel(quote),
      '',
      '',
      formatEUR(-totals.discountAmount),
      formatEUR(-totals.discountAmount * (1 + vatRate)),
    ])
  }

  autoTable(doc, {
    head: [['Position', 'Menge', 'Einzelpreis (Netto)', 'Gesamt (Netto)', 'Gesamt (Brutto)']],
    body: rows,
    startY,
    margin: { left: M, right: M },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      cellPadding: { top: 9, right: 8, bottom: 9, left: 8 },
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: SOFT_BG,
      textColor: INK_MUTED,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'normal' },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 90, halign: 'right' },
      3: { cellWidth: 90, halign: 'right' },
      4: { cellWidth: 90, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      if (data.section === 'head') {
        const { x, y: cy, height } = data.cell
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
        doc.setLineWidth(0.5)
        doc.line(x, cy + height, x + data.cell.width, cy + height)
      }
    },
  })
}

// ── Internal table ─────────────────────────────────────────────────────────

function buildInternalTable(
  doc: jsPDF,
  quote: QuoteWithItems,
  totals: QuoteTotals,
  startY: number,
  M: number,
  vatRate: number,
): void {
  const rows: (string | { content: string; styles: Record<string, unknown> })[][] = []

  for (const l of totals.lines) {
    const name = itemName(l.item)
    const nameCell =
      l.item.customNote && l.item.customNote.trim()
        ? { content: `${name}\n${l.item.customNote}`, styles: { fontStyle: 'normal' } }
        : name

    const purchasePrice = l.service ? l.service.purchasePrice : 0
    const vkNettoPerUnit = l.item.unitPrice
    const vkBruttoPerUnit = l.item.unitPrice * (1 + vatRate)
    const marginPct = vkNettoPerUnit > 0 ? (vkNettoPerUnit - purchasePrice) / vkNettoPerUnit : 0

    rows.push([
      nameCell,
      String(l.item.quantity),
      formatEUR(purchasePrice),
      formatEUR(vkNettoPerUnit),
      formatEUR(vkBruttoPerUnit),
      formatPct(marginPct),
    ])
  }

  // Discount row
  if (totals.discountAmount > 0) {
    rows.push([
      discountLabel(quote),
      '',
      '',
      formatEUR(-totals.discountAmount),
      formatEUR(-totals.discountAmount * (1 + vatRate)),
      '',
    ])
  }

  autoTable(doc, {
    head: [['Position', 'Menge', 'EK-Netto', 'VK-Netto', 'VK-Brutto', 'Marge']],
    body: rows,
    startY,
    margin: { left: M, right: M },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      cellPadding: { top: 9, right: 8, bottom: 9, left: 8 },
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: SOFT_BG,
      textColor: INK_MUTED,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'normal' },
      1: { cellWidth: 44, halign: 'right' },
      2: { cellWidth: 70, halign: 'right' },
      3: { cellWidth: 70, halign: 'right' },
      4: { cellWidth: 78, halign: 'right' },
      5: { cellWidth: 58, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      if (data.section === 'head') {
        const { x, y: cy, height } = data.cell
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
        doc.setLineWidth(0.5)
        doc.line(x, cy + height, x + data.cell.width, cy + height)
      }
    },
  })
}