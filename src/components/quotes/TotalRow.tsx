interface TotalRowProps {
  label: string
  value: string
  bold?: boolean
  accent?: boolean
  className?: string
}

export function TotalRow({ label, value, bold, accent, className = '' }: TotalRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={[
          'text-sm',
          bold ? 'font-semibold text-ink' : 'text-ink-soft',
          className,
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'num text-sm',
          bold ? 'font-bold' : '',
          accent ? 'text-accent-strong' : 'text-ink',
          className,
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
