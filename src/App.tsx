import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './hooks/useApp'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CalculatorPage = lazy(() => import('./pages/CalculatorPage'))
const AngebotePage = lazy(() => import('./pages/AngebotePage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const PriceListPage = lazy(() => import('./pages/PriceListPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'))

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="rechner" element={<CalculatorPage />} />
              <Route path="angebote" element={<AngebotePage />} />
              <Route path="kunden" element={<CustomersPage />} />
              <Route path="projekte" element={<ProjectsPage />} />
              <Route path="rechnungen" element={<InvoicesPage />} />
              <Route path="kategorien" element={<CategoriesPage />} />
              <Route path="preisliste" element={<PriceListPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="einstellungen" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppProvider>
  )
}
