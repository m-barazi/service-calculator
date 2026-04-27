import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CartTotals, Settings } from '../types'
import { formatDate, formatEUR, formatPct } from './format'

export interface PdfOptions {
  customerName?: string
  projectTitle?: string
  notes?: string
  showProfit: boolean
}

const ACCENT: [number, number, number] = [5, 150, 105] // emerald-600
const INK: [number, number, number] = [23, 23, 23]
const INK_SOFT: [number, number, number] = [82, 82, 82]
const INK_MUTED: [number, number, number] = [140, 140, 140]
const BORDER: [number, number, number] = [228, 228, 228]
const SOFT_BG: [number, number, number] = [250, 250, 249]

export function generatePdfReport(
  totals: CartTotals,
  settings: Settings,
  opts: PdfOptions,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 48 // outer margin
  let y = M

  // ---- HEADER -----------------------------------------------
  // Logo mark — pure SVG-style square with "lines" using vector primitives
  const markX = M
  const markY = y
  const markSize = 36
  doc.setFillColor(INK[0], INK[1], INK[2])
  doc.roundedRect(markX, markY, markSize, markSize, 8, 8, 'F')
  // Three lines as the logo mark
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.setLineWidth(2.5)
  doc.setLineCap('round')
  doc.line(markX + 9, markY + 12, markX + 28, markY + 12)
  doc.line(markX + 9, markY + 18, markX + 24, markY + 18)
  doc.line(markX + 9, markY + 24, markX + 19, markY + 24)

  // Company name & tagline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(settings.companyName, markX + markSize + 14, markY + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(INK_MUTED[0], INK_MUTED[1], INK_MUTED[2])
  doc.text(settings.companyTagline, markX + markSize + 14, markY + 30)

  // Right-aligned report meta
  doc.setFontSize(8.5)
  doc.setTextColor(INK_MUTED[0], INK_MUTED[1], INK_MUTED[2])
  const metaRightX = pageW - M
  doc.text('KOSTENVORANSCHLAG', metaRightX, markY + 6, { align: 'right' })
  doc.setFontSize(9.5)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(formatDate(new Date()), metaRightX, markY + 22, { align: 'right' })

  y = markY + markSize + 32

  // ---- TITLE ROW --------------------------------------------
  if (opts.projectTitle) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(INK[0], INK[1], INK[2])
    doc.text(opts.projectTitle, M, y)
    y += 12
  }

  // Customer line
  if (opts.customerName) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2])
    doc.text(`Kunde: ${opts.customerName}`, M, y + 14)
    y += 22
  } else {
    y += 8
  }

  // Divider
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.setLineWidth(0.5)
  doc.line(M, y, pageW - M, y)
  y += 18

  // ---- TABLE ------------------------------------------------
  const rows = totals.lines.map((l) => [
    l.service.name,
    String(l.quantity),
    formatEUR(l.service.salePrice),
    formatEUR(l.totalSaleNet),
    formatEUR(l.totalSaleGross),
  ])

  autoTable(doc, {
    head: [['Leistung', 'Menge', 'Einzelpreis', 'Netto', 'Brutto']],
    body: rows,
    startY: y,
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
      2: { cellWidth: 78, halign: 'right' },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      if (data.section === 'head') {
        // Underline for header row
        const { x, y: cy, height } = data.cell
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
        doc.setLineWidth(0.5)
        doc.line(x, cy + height, x + data.cell.width, cy + height)
      }
    },
  })

  // @ts-expect-error lastAutoTable is added by the plugin
  let yAfterTable: number = doc.lastAutoTable.finalY + 28

  // ---- TOTALS BOX -------------------------------------------
  if (yAfterTable > pageH - 250) {
    doc.addPage()
    yAfterTable = M
  }

  const boxX = pageW - M - 280
  const boxW = 280
  let boxY = yAfterTable

  const drawTotalRow = (
    label: string,
    value: string,
    opts2?: { strong?: boolean; accent?: boolean },
  ) => {
    if (opts2?.strong || opts2?.accent) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
    }
    if (opts2?.accent) {
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
    } else if (opts2?.strong) {
      doc.setTextColor(INK[0], INK[1], INK[2])
    } else {
      doc.setTextColor(INK_SOFT[0], INK_SOFT[1], INK_SOFT[2])
    }
    doc.text(label, boxX + 14, boxY + 4)
    doc.text(value, boxX + boxW - 14, boxY + 4, { align: 'right' })
    boxY += 18
  }

  // Subtle background for totals
  doc.setFillColor(SOFT_BG[0], SOFT_BG[1], SOFT_BG[2])
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.roundedRect(
    boxX,
    boxY,
    boxW,
    opts.showProfit ? 168 : 96,
    10,
    10,
    'FD',
  )
  boxY += 18

  drawTotalRow(
    `Zwischensumme (Netto)`,
    formatEUR(totals.totalSaleNet),
  )
  drawTotalRow(
    `MwSt (${(totals.vatRate * 100).toFixed(0).replace('.', ',')}%)`,
    formatEUR(totals.totalSaleGross - totals.totalSaleNet),
  )
  // Divider line in box
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.line(boxX + 14, boxY - 6, boxX + boxW - 14, boxY - 6)
  drawTotalRow('Gesamt (Brutto)', formatEUR(totals.totalSaleGross), {
    strong: true,
  })

  if (opts.showProfit) {
    boxY += 6
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.line(boxX + 14, boxY - 6, boxX + boxW - 14, boxY - 6)

    drawTotalRow('Kosten (Netto)', formatEUR(totals.totalCostNet))
    drawTotalRow('Kosten (Brutto)', formatEUR(totals.totalCostGross))
    drawTotalRow(
      `Gewinn (${formatPct(totals.profitMarginPct)})`,
      formatEUR(totals.profitNet),
      { accent: true },
    )
  }

  // ---- NOTES ------------------------------------------------
  if (opts.notes && opts.notes.trim()) {
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
    const split = doc.splitTextToSize(opts.notes, notesW)
    doc.text(split, M, notesY)
  }

  // ---- FOOTER -----------------------------------------------
  const footerY = pageH - 28
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.line(M, footerY - 12, pageW - M, footerY - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(INK_MUTED[0], INK_MUTED[1], INK_MUTED[2])
  doc.text(
    `${settings.companyName} · Erstellt mit Kostenrechner · ${formatDate(new Date())}`,
    M,
    footerY,
  )
  doc.text(`Seite 1`, pageW - M, footerY, { align: 'right' })

  // Save
  const safeName = (opts.projectTitle || 'Kostenvoranschlag')
    .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  const filename = `${safeName || 'Kostenvoranschlag'}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`

  doc.save(filename)
}
