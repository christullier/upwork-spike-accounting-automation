import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  Menu,
  ReceiptText,
  RotateCcw,
  Settings2,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useStore } from '../store'
import { daysOverdue } from '../lib/calc'
import { todayISO } from '../lib/dates'

const ADMIN_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/invoices', label: 'Invoices', icon: ReceiptText },
  { to: '/pay', label: 'Team & Pay', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function Layout({ children }: { children: ReactNode }) {
  const { state, role, setRole, reset } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const isAdmin = role === 'admin'
  const today = todayISO()
  const overdue = state.invoices.filter((i) => daysOverdue(i, today) > 0).length
  const unallocated = state.jobs.filter((j) => j.status === 'Booked').length

  const changeRole = (value: string) => {
    setRole(value)
    setOpen(false)
    if (value === 'admin') navigate('/')
    else navigate('/portal')
  }

  const title = isAdmin
    ? ADMIN_NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label ?? 'Dashboard'
    : 'Employee portal'

  return (
    <div className="app">
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">SB</div>
          <div>
            <div className="brand-name">{state.company.name}</div>
            <div className="brand-sub">Clyde North · VIC</div>
          </div>
        </div>

        <div className="nav-label">{isAdmin ? 'Workspace' : 'My work'}</div>
        <nav className="nav">
          {isAdmin ? (
            ADMIN_NAV.map((item) => {
              const Icon = item.icon
              const badge = item.to === '/jobs' ? unallocated : item.to === '/invoices' ? overdue : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <Icon />
                  {item.label}
                  {badge > 0 && <span className="nav-count">{badge}</span>}
                </NavLink>
              )
            })
          ) : (
            <NavLink to="/portal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
              <UserRound />
              My dashboard
            </NavLink>
          )}
        </nav>

        <div className="sidebar-foot">
          <strong>Demo mode</strong>
          Sample data only. No login, no payments, no API calls.
          <div style={{ marginTop: 12 }}>
            <button className="nav-item" onClick={() => setConfirmReset(true)} style={{ paddingLeft: 0 }}>
              <RotateCcw />
              Reset demo data
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="mobile-toggle" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="topbar-title">
            {state.company.name} <ChevronRight size={12} style={{ verticalAlign: -1 }} /> {title}
          </div>
          <div className="topbar-spacer" />
          <span className="chip accent" style={{ fontSize: 11.5, fontWeight: 600 }}>
            Demo mode · sample data
          </span>
          <div className="role-switch">
            <label htmlFor="role">View as</label>
            <select id="role" value={role} onChange={(e) => changeRole(e.target.value)}>
              <option value="admin">Admin (Owner)</option>
              {state.staff.map((person) => (
                <option key={person.id} value={person.id}>
                  Portal: {person.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      {confirmReset && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setConfirmReset(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div>
                <h2>Reset demo data?</h2>
                <p>New bookings, invoices and pay changes will be lost.</p>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  reset()
                  setConfirmReset(false)
                }}
              >
                <RotateCcw size={15} /> Reset data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
