import { Clock, CheckCircle, FileText, Send, XCircle } from 'lucide-react'
import type { QuoteStatus } from '../../types'

export const STATUS_MAP: Record<
  QuoteStatus,
  { label: string; icon: typeof FileText; cls: string }
> = {
  draft: { label: 'Entwurf', icon: Clock, cls: 'bg-ink-muted/10 text-ink-muted' },
  sent: { label: 'Gesendet', icon: Send, cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Angenommen', icon: CheckCircle, cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Abgelehnt', icon: XCircle, cls: 'bg-red-100 text-red-700' },
}

export const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Gesendet' },
  { value: 'accepted', label: 'Angenommen' },
  { value: 'rejected', label: 'Abgelehnt' },
]
