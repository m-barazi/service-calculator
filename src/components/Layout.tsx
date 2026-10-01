import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Calculator,
  FileText,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { Logo } from './Logo'
import { useApp } from '../hooks/useApp'

const NAV = [
  { to: '/', icon: Calculator, label: 'Rechner', end: true, group: 'primary' as const },
  { to: '/angebote', icon: FileText, label: 'Angebote', group: 'primary' as const },
  { to: '/kunden', icon: Users, label: 'Kunden', group: 'primary' as const },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'primary' as const },
  { to: '/kategorien', icon: Tags, label: 'Kategorien', group: 'more' as const },
  { to: '/preisliste', icon: Receipt, label: 'Preisliste', group: 'more' as const },
  { to: '/einstellungen', icon: SettingsIcon, label: 'Einstellungen', group: 'more' as const },
]

const PRIMARY_NAV = NAV.filter((n) => n.group === 'primary')
const MORE_NAV = NAV.filter((n) => n.group === 'more')

export function Layout() {
  const { settings, updateSettings, cartLineCount } = useApp()
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const activeMore = MORE_NAV.some((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  )

  return (
    <div className="relative z-10 flex min-h-screen flex-col md:flex-row">
      {/* ─── Sidebar (desktop) ────────────────────────────── */}
      <aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 border-r border-border bg-canvas/80 backdrop-blur-xl md:flex md:flex-col">
        <div className="flex items-center gap-3 px-6 py-6">
          <Logo size={36} src={settings.companyLogo} />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight text-ink">
              {settings.companyName || 'Kostenrechner'}
            </span>
            <span className="mt-1 text-2xs uppercase tracking-wider text-ink-muted">
              Kostenrechner
            </span>
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-surface text-ink shadow-soft'
                    : 'text-ink-soft hover:bg-surface/60 hover:text-ink',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{label}</span>
                  {to === '/' && cartLineCount > 0 && (
                    <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-2xs font-semibold text-accent-strong num">
                      {cartLineCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-3 pb-6">
          {/* Theme switcher */}
          <div className="rounded-xl border border-border bg-surface/60 p-1">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ['light', 'Hell', Sun],
                  ['system', 'Auto', Monitor],
                  ['dark', 'Dunkel', Moon],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ theme: value })}
                  className={[
                    'flex flex-col items-center gap-1 rounded-lg py-2 text-2xs font-medium transition-colors',
                    settings.theme === value
                      ? 'bg-elevated text-ink shadow-soft'
                      : 'text-ink-muted hover:text-ink',
                  ].join(' ')}
                  aria-label={`Theme: ${label}`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 px-2 text-2xs text-ink-muted">
            Version 1.0 · Sleek
          </p>
        </div>
      </aside>

      {/* ─── Mobile top bar ─────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-canvas/85 px-5 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2.5">
          <Logo size={32} src={settings.companyLogo} />
          <span className="text-sm font-bold tracking-tight">
            {settings.companyName || 'Kostenrechner'}
          </span>
        </div>
        <button
          onClick={() =>
            updateSettings({
              theme:
                settings.theme === 'dark'
                  ? 'light'
                  : settings.theme === 'light'
                    ? 'system'
                    : 'dark',
            })
          }
          className="qty-btn"
          aria-label="Theme wechseln"
        >
          {settings.theme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : settings.theme === 'light' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
        </button>
      </header>

      {/* ─── Main content ───────────────────────────────── */}
      <main className="relative flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>

      {/* ─── Mobile bottom nav ──────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border bg-canvas/90 backdrop-blur-xl pb-safe md:hidden">
        {PRIMARY_NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'relative flex flex-col items-center justify-center gap-1 py-3 text-2xs font-medium transition-colors',
                isActive ? 'text-ink' : 'text-ink-muted',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-accent" />
                )}
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={[
            'relative flex flex-col items-center justify-center gap-1 py-3 text-2xs font-medium transition-colors',
            activeMore ? 'text-ink' : 'text-ink-muted',
          ].join(' ')}
          aria-label="Mehr"
        >
          <Menu className="h-5 w-5" strokeWidth={activeMore ? 2.2 : 1.8} />
          <span>Mehr</span>
          {activeMore && (
            <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-accent" />
          )}
        </button>
      </nav>

      {/* ─── Mobile "Mehr" sheet ────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-canvas/60 backdrop-blur-md"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="absolute bottom-0 left-0 right-0 animate-slide-up rounded-t-3xl border-t border-border bg-elevated p-4 pb-safe shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Mehr</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="qty-btn"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE_NAV.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-all',
                      isActive
                        ? 'border-accent bg-accent/10 text-ink'
                        : 'border-border bg-surface text-ink-soft hover:border-border-strong hover:text-ink',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
