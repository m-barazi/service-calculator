import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  size?: 'sm' | 'md'
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  size = 'md',
}: QuantityStepperProps) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))
  const change = (raw: string) => {
    const n = parseInt(raw, 10)
    if (isNaN(n)) onChange(0)
    else onChange(Math.max(min, Math.min(max, n)))
  }

  const inputCls =
    size === 'sm'
      ? 'h-7 w-12 text-xs'
      : 'h-8 w-14 text-sm'

  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="qty-btn"
        aria-label="Anzahl verringern"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => change(e.target.value)}
        className={`${inputCls} bg-transparent text-center font-mono tabular-nums focus:outline-none`}
        min={min}
        max={max}
      />
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="qty-btn"
        aria-label="Anzahl erhöhen"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
