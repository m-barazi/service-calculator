import { useEffect } from 'react'
import type { Settings } from '../types'

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  // Update theme-color meta for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', isDark ? '#0a0a0a' : '#fafaf9')
}

export function useTheme(theme: Settings['theme']) {
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])
}
