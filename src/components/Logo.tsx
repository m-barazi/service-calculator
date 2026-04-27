interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-ink ${className}`}
      style={{ width: size, height: size }}
      aria-label="Kostenrechner Logo"
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 4h12M2 8h9M2 12h6"
          stroke="rgb(var(--accent))"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
