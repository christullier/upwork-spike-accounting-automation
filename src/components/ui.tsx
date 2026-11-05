import { useEffect, type ReactNode } from 'react'
import { AlertTriangle, Check, Info, X, XCircle } from 'lucide-react'
import type { Invoice, JobStatus } from '../types'
import { useStore } from '../store'
import { daysOverdue } from '../lib/calc'

const JOB_CLASS: Record<JobStatus, string> = {
  Booked: 'booked',
  Allocated: 'allocated',
  Shot: 'shot',
  Delivered: 'delivered',
  Invoiced: 'invoiced',
  Paid: 'paid',
}

export function StatusPill({ status }: { status: JobStatus }) {
  return <span className={`pill pill-${JOB_CLASS[status]}`}>{status}</span>
}

export function InvoicePill({ invoice, today }: { invoice: Invoice; today?: string }) {
  if (invoice.status === 'paid') return <span className="pill pill-paid">Paid</span>
  if (invoice.status === 'draft') return <span className="pill pill-draft">Draft</span>
  const late = daysOverdue(invoice, today)
  if (late > 0) return <span className="pill pill-overdue">Overdue {late}d</span>
  return <span className="pill pill-sent">Sent</span>
}

export function PayPill({ status }: { status: 'pending' | 'paid' }) {
  return <span className={`pill pill-${status}`}>{status === 'paid' ? 'Paid' : 'Pending'}</span>
}

export function Avatar({ name, initials, tone = 0, large }: { name: string; initials: string; tone?: number; large?: boolean }) {
  const tones = ['', 'amber', 'blue', 'violet']
  const cls = tones[tone % tones.length]
  return (
    <span className={`avatar ${cls} ${large ? 'lg' : ''}`} title={name}>
      {initials}
    </span>
  )
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{title}</div>
              {subtitle && <div className="small muted" style={{ marginTop: 5 }}>{subtitle}</div>}
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {children && <div className="small" style={{ marginTop: 4 }}>{children}</div>}
    </div>
  )
}

export function Toast() {
  const { toast, dismissToast } = useStore()
  if (!toast) return null
  const Icon = toast.tone === 'warn' ? AlertTriangle : toast.tone === 'info' ? Info : Check
  return (
    <div className={`toast ${toast.tone}`} role="status">
      <div className="toast-icon">
        <Icon size={16} />
      </div>
      <div>
        <div className="toast-title">{toast.title}</div>
        {toast.detail && <div className="toast-detail">{toast.detail}</div>}
      </div>
      <button className="toast-close" onClick={dismissToast} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="settings-note" style={{ background: 'var(--red-soft)', borderColor: '#f6cdc8', color: 'var(--red)' }}>
      <XCircle size={15} style={{ flex: '0 0 auto', marginTop: 1 }} />
      <span>{children}</span>
    </div>
  )
}

export function shortTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')}${suffix}`
}
