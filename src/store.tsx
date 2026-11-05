import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppState, Client, Invoice, Job, JobStatus, PayLine, Role, Service, Settings, Staff } from './types'
import { buildSeed, SEED_VERSION } from './data/seed'
import { buildInvoice, invoiceTotals, payLinesFor } from './lib/calc'
import { addDays, endOfWeek, fmtDate, todayISO } from './lib/dates'
import { money } from './lib/format'

const STORAGE_KEY = 'shootbooks.state.v3'

export interface Toast {
  id: number
  title: string
  detail?: string
  tone: 'success' | 'info' | 'warn'
}

export interface NewJobInput {
  clientId: string
  address: string
  suburb: string
  date: string
  time: string
  services: string[]
  notes?: string
}

interface Store {
  state: AppState
  role: Role
  setRole: (role: Role) => void
  toast: Toast | null
  dismissToast: () => void
  notify: (title: string, detail?: string, tone?: Toast['tone']) => void
  addJob: (input: NewJobInput) => Job
  assignStaff: (jobId: string, staffIds: string[]) => void
  advance: (jobId: string) => void
  markInvoicePaid: (invoiceId: string) => void
  sendInvoice: (invoiceId: string) => void
  approvePayRun: (weekEnding: string) => void
  payCommission: (jobId: string) => void
  updateService: (id: string, patch: Partial<Pick<Service, 'price' | 'pay' | 'name'>>) => void
  updateClient: (id: string, patch: Partial<Pick<Client, 'commissionPct'>>) => void
  updateSettings: (patch: Partial<Settings>) => void
  reset: () => void
  clientOf: (id: string) => Client | undefined
  staffOf: (id: string) => Staff | undefined
  serviceOf: (id: string) => Service | undefined
  nextStatus: (job: Job) => JobStatus | null
}

const StoreContext = createContext<Store | null>(null)

export const STATUS_ORDER: JobStatus[] = ['Booked', 'Allocated', 'Shot', 'Delivered', 'Invoiced', 'Paid']

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildSeed()
    const parsed = JSON.parse(raw) as AppState
    if (!parsed || parsed.version !== SEED_VERSION) return buildSeed()
    return parsed
  } catch {
    return buildSeed()
  }
}

function nextInvoiceNumber(invoices: Invoice[]): string {
  const highest = invoices.reduce((max, inv) => {
    const n = Number(inv.number.replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 1000)
  return `INV-${highest + 1}`
}

function nextJobRef(jobs: Job[]): string {
  const highest = jobs.reduce((max, job) => {
    const n = Number(job.ref.replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 1040)
  return `JOB-${highest + 1}`
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [role, setRole] = useState<Role>('admin')
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | null>(null)
  const stateRef = useRef(state)

  const commit = useCallback((next: AppState) => {
    stateRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can be full or blocked; the demo still works in memory.
    }
  }, [state])

  const notify = useCallback((title: string, detail?: string, tone: Toast['tone'] = 'success') => {
    if (timer.current) window.clearTimeout(timer.current)
    setToast({ id: Date.now(), title, detail, tone })
    timer.current = window.setTimeout(() => setToast(null), 5200)
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const clientOf = useCallback((id: string) => state.clients.find((c) => c.id === id), [state.clients])
  const staffOf = useCallback((id: string) => state.staff.find((s) => s.id === id), [state.staff])
  const serviceOf = useCallback((id: string) => state.services.find((s) => s.id === id), [state.services])

  const addJob = useCallback(
    (input: NewJobInput): Job => {
      const prev = stateRef.current
      const job: Job = {
        id: `job-${Date.now()}`,
        ref: nextJobRef(prev.jobs),
        clientId: input.clientId,
        address: input.address,
        suburb: input.suburb,
        date: input.date,
        time: input.time,
        services: input.services,
        status: 'Booked',
        staff: [],
        notes: input.notes,
      }
      commit({ ...prev, jobs: [...prev.jobs, job] })
      notify(
        `Booking ${job.ref} added`,
        `${input.address}, ${input.suburb} · ${fmtDate(input.date, { weekday: 'short', day: 'numeric', month: 'short' })} at ${input.time}`,
      )
      return job
    },
    [commit, notify],
  )

  const assignStaff = useCallback(
    (jobId: string, staffIds: string[]) => {
      const prev = stateRef.current
      commit({
        ...prev,
        jobs: prev.jobs.map((job) =>
          job.id === jobId
            ? { ...job, staff: staffIds, status: job.status === 'Booked' ? 'Allocated' : job.status }
            : job,
        ),
      })
      const names = staffIds
        .map((id) => prev.staff.find((s) => s.id === id)?.name.split(' ')[0])
        .filter(Boolean)
        .join(' and ')
      if (names) notify('Team allocated', `${names} added to the job.`)
    },
    [commit, notify],
  )

  const advance = useCallback(
    (jobId: string) => {
      const prev = stateRef.current
      const job = prev.jobs.find((j) => j.id === jobId)
      if (!job) return
      const index = STATUS_ORDER.indexOf(job.status)
      if (index < 0 || index >= STATUS_ORDER.length - 1) return
      const next = STATUS_ORDER[index + 1]
      if (next === 'Allocated' && job.staff.length === 0) {
        notify('Assign a team member first', 'Use Smart Allocate to pick the best person.', 'warn')
        return
      }

      let invoices = prev.invoices
      let payLines = prev.payLines
      let updatedJob: Job = job
      const clientName = prev.clients.find((c) => c.id === job.clientId)?.name ?? 'client'

      if (next === 'Delivered') {
        let invoice = invoices.find((i) => i.jobId === job.id)
        if (!invoice) {
          invoice = buildInvoice(job, prev, nextInvoiceNumber(invoices), todayISO())
          invoices = [...invoices, invoice]
        }
        if (!payLines.some((l) => l.jobId === job.id)) {
          const drafts = payLinesFor(job, prev.staff, prev.services)
          payLines = [
            ...payLines,
            ...drafts.map((draft, i) => ({
              ...draft,
              id: `pl-${job.id}-${Date.now()}-${i}`,
              jobId: job.id,
              status: 'pending' as const,
            })),
          ]
        }
        updatedJob = { ...job, status: next, invoiceId: invoice.id }
        const totals = invoiceTotals(invoice, prev.settings.gstPct)
        const count = payLines.filter((l) => l.jobId === job.id).length
        notify(
          `${invoice.number} created · ${money(totals.total)} inc GST`,
          `${count} pay line${count === 1 ? '' : 's'} added · draft invoice ready to send`,
        )
      } else if (next === 'Invoiced') {
        invoices = invoices.map((inv) =>
          inv.jobId === job.id && inv.status === 'draft'
            ? { ...inv, status: 'sent', issued: todayISO(), due: addDays(todayISO(), prev.settings.paymentTermsDays) }
            : inv,
        )
        updatedJob = { ...job, status: next }
        const invoice = invoices.find((i) => i.jobId === job.id)
        if (invoice) {
          notify(
            `${invoice.number} sent to ${clientName}`,
            `Due ${new Date(`${invoice.due}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · ${money(invoiceTotals(invoice, prev.settings.gstPct).total)} inc GST`,
          )
        }
      } else if (next === 'Paid') {
        invoices = invoices.map((inv) => (inv.jobId === job.id ? { ...inv, status: 'paid', paidDate: todayISO() } : inv))
        updatedJob = { ...job, status: next }
        const invoice = invoices.find((i) => i.jobId === job.id)
        if (invoice) {
          notify(`${invoice.number} marked paid`, `${money(invoiceTotals(invoice, prev.settings.gstPct).total)} received from ${clientName}`)
        }
      } else {
        updatedJob = { ...job, status: next }
        notify(`${job.ref} moved to ${next}`, next === 'Shot' ? 'Deliver the job when the files are edited and uploaded.' : undefined)
      }

      commit({
        ...prev,
        jobs: prev.jobs.map((j) => (j.id === jobId ? updatedJob : j)),
        invoices,
        payLines,
      })
    },
    [commit, notify],
  )

  const markInvoicePaid = useCallback(
    (invoiceId: string) => {
      const prev = stateRef.current
      const invoice = prev.invoices.find((i) => i.id === invoiceId)
      if (!invoice) return
      const total = invoiceTotals(invoice, prev.settings.gstPct).total
      commit({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'paid', paidDate: todayISO() } : i)),
        jobs: prev.jobs.map((j) => (j.invoiceId === invoiceId ? { ...j, status: 'Paid' } : j)),
      })
      notify(`${invoice.number} marked paid`, `${money(total)} received`)
    },
    [commit, notify],
  )

  const sendInvoice = useCallback(
    (invoiceId: string) => {
      const prev = stateRef.current
      const invoice = prev.invoices.find((i) => i.id === invoiceId)
      if (!invoice) return
      const issued = todayISO()
      commit({
        ...prev,
        invoices: prev.invoices.map((i) =>
          i.id === invoiceId ? { ...i, status: 'sent', issued, due: addDays(issued, prev.settings.paymentTermsDays) } : i,
        ),
        jobs: prev.jobs.map((j) =>
          j.invoiceId === invoiceId && j.status === 'Delivered' ? { ...j, status: 'Invoiced' } : j,
        ),
      })
      notify(`${invoice.number} sent`, `Payment due in ${prev.settings.paymentTermsDays} days · reminder scheduled`)
    },
    [commit, notify],
  )

  const approvePayRun = useCallback(
    (weekEnding: string) => {
      const prev = stateRef.current
      const pending = prev.payLines.filter((l) => l.weekEnding === weekEnding && l.status === 'pending')
      if (pending.length === 0) {
        notify('Nothing to approve', 'This pay period has no pending lines.', 'warn')
        return
      }
      const total = pending.reduce((sum, l) => sum + l.base + l.loading, 0)
      commit({
        ...prev,
        payLines: prev.payLines.map((l) => (l.weekEnding === weekEnding ? { ...l, status: 'paid' } : l)),
      })
      notify('Pay run approved', `${money(total)} across ${pending.length} pay line${pending.length === 1 ? '' : 's'} · marked paid`)
    },
    [commit, notify],
  )

  const payCommission = useCallback(
    (jobId: string) => {
      const prev = stateRef.current
      const job = prev.jobs.find((j) => j.id === jobId)
      const client = job ? prev.clients.find((c) => c.id === job.clientId) : undefined
      if (!job || !client) return
      commit({ ...prev, commissionsPaid: [...prev.commissionsPaid, jobId] })
      notify('Commission paid', `${client.agent} · ${client.name}`)
    },
    [commit, notify],
  )

  const updateService = useCallback(
    (id: string, patch: Partial<Pick<Service, 'price' | 'pay' | 'name'>>) => {
      const prev = stateRef.current
      const services = prev.services.map((s) => (s.id === id ? { ...s, ...patch } : s))
      const invoices = prev.invoices.map((inv) => {
        if (inv.status !== 'draft') return inv
        const lines = inv.lines.map((line) => {
          if (line.serviceId !== id) return line
          const service = services.find((s) => s.id === id)
          if (!service) return line
          return { ...line, unitPrice: service.price, description: service.name }
        })
        return { ...inv, lines }
      })

      const jobsWithPending = new Set(prev.payLines.filter((l) => l.status === 'pending').map((l) => l.jobId))
      const recomputed: PayLine[] = []
      prev.jobs.forEach((job) => {
        if (!jobsWithPending.has(job.id)) return
        payLinesFor(job, prev.staff, services).forEach((draft, i) => {
          recomputed.push({
            ...draft,
            id: `pl-${job.id}-r-${Date.now()}-${i}`,
            jobId: job.id,
            status: 'pending',
          })
        })
      })
      commit({
        ...prev,
        services,
        invoices,
        payLines: [...prev.payLines.filter((l) => l.status !== 'pending'), ...recomputed],
      })
    },
    [commit],
  )

  const updateClient = useCallback(
    (id: string, patch: Partial<Pick<Client, 'commissionPct'>>) => {
      const prev = stateRef.current
      commit({ ...prev, clients: prev.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
    },
    [commit],
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const prev = stateRef.current
      commit({ ...prev, settings: { ...prev.settings, ...patch } })
    },
    [commit],
  )

  const reset = useCallback(() => {
    commit(buildSeed())
    setRole('admin')
    notify('Demo data reset', 'All sample jobs, invoices and payslips are back to the starting point.', 'info')
  }, [commit, notify])

  const nextStatus = useCallback((job: Job): JobStatus | null => {
    const index = STATUS_ORDER.indexOf(job.status)
    return index >= 0 && index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null
  }, [])

  const value = useMemo<Store>(
    () => ({
      state,
      role,
      setRole,
      toast,
      dismissToast,
      notify,
      addJob,
      assignStaff,
      advance,
      markInvoicePaid,
      sendInvoice,
      approvePayRun,
      payCommission,
      updateService,
      updateClient,
      updateSettings,
      reset,
      clientOf,
      staffOf,
      serviceOf,
      nextStatus,
    }),
    [
      state,
      role,
      toast,
      dismissToast,
      notify,
      addJob,
      assignStaff,
      advance,
      markInvoicePaid,
      sendInvoice,
      approvePayRun,
      payCommission,
      updateService,
      updateClient,
      updateSettings,
      reset,
      clientOf,
      staffOf,
      serviceOf,
      nextStatus,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be inside StoreProvider')
  return ctx
}

export function weekEndingFor(date: string): string {
  return endOfWeek(date)
}
