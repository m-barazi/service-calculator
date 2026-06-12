import { Route, Routes } from 'react-router-dom'
import { AppProvider } from './hooks/useApp'
import { Layout } from './components/Layout'
import { CalculatorPage } from './pages/CalculatorPage'
import { AngebotePage } from './pages/AngebotePage'
import { CategoriesPage } from './pages/CategoriesPage'
import { PriceListPage } from './pages/PriceListPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CalculatorPage />} />
          <Route path="angebote" element={<AngebotePage />} />
          <Route path="kategorien" element={<CategoriesPage />} />
          <Route path="preisliste" element={<PriceListPage />} />
          <Route path="einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<CalculatorPage />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
