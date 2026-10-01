import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './hooks/useApp'
import { Layout } from './components/Layout'
import { CalculatorPage } from './pages/CalculatorPage'
import { AngebotePage } from './pages/AngebotePage'
import { CustomersPage } from './pages/CustomersPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { PriceListPage } from './pages/PriceListPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="rechner" element={<CalculatorPage />} />
          <Route path="angebote" element={<AngebotePage />} />
          <Route path="kunden" element={<CustomersPage />} />
          <Route path="kategorien" element={<CategoriesPage />} />
          <Route path="preisliste" element={<PriceListPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
