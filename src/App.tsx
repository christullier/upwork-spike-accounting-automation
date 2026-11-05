import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store'
import { Layout } from './components/Layout'
import { Toast } from './components/ui'
import { DashboardPage } from './pages/DashboardPage'
import { CalendarPage } from './pages/CalendarPage'
import { JobsPage } from './pages/JobsPage'
import { InvoicesPage, InvoiceDetailPage } from './pages/InvoicesPage'
import { PayPage } from './pages/PayPage'
import { SettingsPage } from './pages/SettingsPage'
import { PortalPage } from './pages/PortalPage'

function AdminOnly({ children }: { children: ReactNode }) {
  const { role } = useStore()
  if (role !== 'admin') return <Navigate to="/portal" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminOnly><DashboardPage /></AdminOnly>} />
      <Route path="/calendar" element={<AdminOnly><CalendarPage /></AdminOnly>} />
      <Route path="/jobs" element={<AdminOnly><JobsPage /></AdminOnly>} />
      <Route path="/invoices" element={<AdminOnly><InvoicesPage /></AdminOnly>} />
      <Route path="/invoices/:invoiceId" element={<AdminOnly><InvoiceDetailPage /></AdminOnly>} />
      <Route path="/pay" element={<AdminOnly><PayPage /></AdminOnly>} />
      <Route path="/settings" element={<AdminOnly><SettingsPage /></AdminOnly>} />
      <Route path="/portal" element={<PortalPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Layout>
          <AppRoutes />
        </Layout>
        <Toast />
      </HashRouter>
    </StoreProvider>
  )
}
