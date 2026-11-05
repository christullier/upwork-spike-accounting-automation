import type { AppState, Client, Invoice, Job, PayLine, Service, Skill, Staff } from '../types'
import { daysBetween, endOfWeek, isWeekend, monthKey, startOfWeek, todayISO } from './dates'
import { round2 } from './format'

export const SUBURBS = ['Clyde North', 'Berwick', 'Officer', 'Cranbourne', 'Pakenham', 'Narre Warren', 'Remote']

/** Road distance in km between the suburbs we work in. */
const KM: Record<string, Record<string, number>> = {
  'Clyde North': { 'Clyde North': 0, Berwick: 7, Officer: 9, Cranbourne: 8, Pakenham: 15, 'Narre Warren': 13, Remote: 0 },
  Berwick: { 'Clyde North': 7, Berwick: 0, Officer: 7, Cranbourne: 11, Pakenham: 17, 'Narre Warren': 10, Remote: 0 },
  Officer: { 'Clyde North': 9, Berwick: 7, Officer: 0, Cranbourne: 13, Pakenham: 19, 'Narre Warren': 15, Remote: 0 },
  Cranbourne: { 'Clyde North': 8, Berwick: 11, Officer: 13, Cranbourne: 0, Pakenham: 12, 'Narre Warren': 9, Remote: 0 },
  Pakenham: { 'Clyde North': 15, Berwick: 17, Officer: 19, Cranbourne: 12, Pakenham: 0, 'Narre Warren': 16, Remote: 0 },
  'Narre Warren': { 'Clyde North': 13, Berwick: 10, Officer: 15, Cranbourne: 9, Pakenham: 16, 'Narre Warren': 0, Remote: 0 },
  Remote: { 'Clyde North': 0, Berwick: 0, Officer: 0, Cranbourne: 0, Pakenham: 0, 'Narre Warren': 0, Remote: 0 },
}

export function distanceKm(from: string, to: string): number {
  return KM[from]?.[to] ?? 10
}

export function serviceById(services: Service[], id: string): Service | undefined {
  return services.find((s) => s.id === id)
}

export function clientById(clients: Client[], id: string): Client | undefined {
  return clients.find((c) => c.id === id)
}

export function jobSubtotal(job: Job, services: Service[]): number {
  return round2(job.services.reduce((sum, id) => sum + (serviceById(services, id)?.price ?? 0), 0))
}

export function jobTeamPay(job: Job, services: Service[]): number {
  return round2(job.services.reduce((sum, id) => sum + (serviceById(services, id)?.pay ?? 0), 0))
}

export function invoiceSubtotal(inv: Invoice): number {
  return round2(inv.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0))
}

export function invoiceTotals(inv: Invoice, gstPct: number): { subtotal: number; gst: number; total: number } {
  const subtotal = invoiceSubtotal(inv)
  const gst = round2((subtotal * gstPct) / 100)
  return { subtotal, gst, total: round2(subtotal + gst) }
}

export function linesForJob(job: Job, services: Service[]): Invoice['lines'] {
  return job.services.flatMap((id) => {
    const s = serviceById(services, id)
    if (!s) return []
    return [{ serviceId: s.id, description: s.name, qty: 1, unitPrice: s.price }]
  })
}

export function buildInvoice(
  job: Job,
  state: Pick<AppState, 'services' | 'settings'>,
  number: string,
  issued: string,
): Invoice {
  return {
    id: `inv-${job.id}`,
    number,
    jobId: job.id,
    clientId: job.clientId,
    issued,
    due: addTermDays(issued, state.settings.paymentTermsDays),
    lines: linesForJob(job, state.services),
    status: 'draft',
  }
}

function addTermDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Commissions are earned when an invoice is issued, on the GST-exclusive amount. */
export function commissionFor(
  job: Job,
  state: Pick<AppState, 'clients' | 'services' | 'invoices'>,
): { clientId: string; pct: number; base: number; amount: number } | null {
  const client = clientById(state.clients, job.clientId)
  if (!client) return null
  const invoice = state.invoices.find((i) => i.jobId === job.id)
  if (!invoice || invoice.status === 'draft') return null
  const base = invoiceSubtotal(invoice)
  return { clientId: client.id, pct: client.commissionPct, base, amount: round2((base * client.commissionPct) / 100) }
}

export function commissionOnSubtotal(clientId: string, base: number, clients: Client[]): number {
  const client = clientById(clients, clientId)
  if (!client) return 0
  return round2((base * client.commissionPct) / 100)
}

export interface PayDraft {
  staffId: string
  description: string
  base: number
  loading: number
  hours: number
  rate: number
  weekEnding: string
}

/** Team pay for a job. Each service pays the assigned person who holds its skill. */
export function payLinesFor(
  job: Job,
  staff: Staff[],
  services: Service[],
): PayDraft[] {
  const byStaff = new Map<string, { names: string[]; base: number; hours: number }>()
  const add = (staffId: string, name: string, base: number, hours: number) => {
    const row = byStaff.get(staffId) ?? { names: [], base: 0, hours: 0 }
    row.names.push(name)
    row.base += base
    row.hours += hours
    byStaff.set(staffId, row)
  }

  job.services.forEach((id) => {
    const service = serviceById(services, id)
    if (!service) return
    const holder = job.staff.find((sid) => staff.find((p) => p.id === sid)?.skills.includes(service.skill))
    const fallback = job.staff[0]
    const assignee = holder ?? fallback
    if (assignee) add(assignee, service.name, service.pay, service.hours)
  })

  const editorService = job.services
    .map((id) => serviceById(services, id))
    .find((s) => s?.editHours && s.editHours > 0)
  const editor = staff.find((p) => p.skills.includes('editor'))
  if (editorService?.editHours && editor) {
    add(editor.id, `Edit: ${editorService.name}`, round2(editorService.editHours * editor.hourlyRate), editorService.editHours)
  }

  const weekend = isWeekend(job.date)
  const weekEnding = endOfWeek(job.date)

  return Array.from(byStaff.entries()).map(([staffId, row]) => {
    const person = staff.find((p) => p.id === staffId)!
    const loading = weekend ? round2((row.base * person.weekendLoadingPct) / 100) : 0
    return {
      staffId,
      description: row.names.join(' · '),
      base: round2(row.base),
      loading,
      hours: round2(row.hours),
      rate: row.hours > 0 ? round2(row.base / row.hours) : person.hourlyRate,
      weekEnding,
    }
  })
}

export function payGross(line: PayLine): number {
  return round2(line.base + line.loading)
}

export interface StaffScore {
  staff: Staff
  score: number
  skill: number
  missingPenalty: number
  coverage: number
  requiredCount: number
  available: boolean
  distanceKm: number
  distanceScore: number
  load: number
  loadScore: number
  missing: Skill[]
  reason: string
}

export function requiredSkills(job: Job, services: Service[]): Skill[] {
  return Array.from(new Set(job.services.map((id) => serviceById(services, id)?.skill).filter(Boolean) as Skill[]))
}

export function scoreStaff(job: Job, staff: Staff[], jobs: Job[], services: Service[]): StaffScore[] {
  const required = requiredSkills(job, services)
  const week = startOfWeek(job.date)

  return staff
    .map((person) => {
      const matched = required.filter((skill) => person.skills.includes(skill))
      const missing = required.filter((skill) => !person.skills.includes(skill))
      const coverage = required.length === 0 ? 1 : matched.length / required.length
      const skill = Math.round(50 * coverage)
      const missingPenalty = -100 * missing.length
      const available = !person.unavailable.includes(job.date)
      const availableScore = available ? 30 : 0
      const km = person.remote ? 0 : distanceKm(person.suburb, job.suburb)
      const distanceScore = -Math.round(km * 2)
      const load = jobs.filter(
        (j) => j.id !== job.id && j.staff.includes(person.id) && startOfWeek(j.date) === week,
      ).length
      const loadScore = -5 * load
      const score = skill + missingPenalty + availableScore + distanceScore + loadScore

      const parts: string[] = []
      if (missing.length === 0) parts.push(required.length > 1 ? 'all skills covered' : 'skill match')
      else parts.push(`missing ${missing.join(', ')}`)
      parts.push(available ? 'free that day' : 'unavailable that day')
      if (person.remote) parts.push('works remotely')
      else parts.push(`${km} km from ${person.suburb}`)
      parts.push(load === 0 ? 'no other jobs that week' : `${load} other job${load === 1 ? '' : 's'} that week`)
      const reason = parts.join(' · ')

      return {
        staff: person,
        score,
        skill,
        missingPenalty,
        coverage: matched.length,
        requiredCount: required.length,
        available,
        distanceKm: km,
        distanceScore,
        load,
        loadScore,
        missing,
        reason,
      }
    })
    .sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage
      if (a.available !== b.available) return a.available ? -1 : 1
      return b.score - a.score
    })
}

export interface DashboardTotals {
  revenue: number
  outstanding: number
  overdueCount: number
  overdueAmount: number
  teamPayOwed: number
  commissionsOwed: number
  expenses: number
  netProfit: number
  issuedCount: number
  unallocated: number
  deliveredNotInvoiced: number
  drafts: number
}

export function dashboardTotals(state: AppState, today = todayISO()): DashboardTotals {
  const month = monthKey(today)
  const issued = state.invoices.filter((i) => i.status !== 'draft')
  const monthInvoices = issued.filter((i) => monthKey(i.issued) === month)
  const revenue = round2(monthInvoices.reduce((sum, i) => sum + invoiceSubtotal(i), 0))

  const open = state.invoices.filter((i) => i.status === 'sent')
  const outstanding = round2(open.reduce((sum, i) => sum + invoiceTotals(i, state.settings.gstPct).total, 0))
  const overdue = open.filter((i) => i.due < today)
  const overdueAmount = round2(overdue.reduce((sum, i) => sum + invoiceTotals(i, state.settings.gstPct).total, 0))

  const teamPayOwed = round2(
    state.payLines.filter((l) => l.status === 'pending').reduce((sum, l) => sum + payGross(l), 0),
  )
  const monthJobIds = new Set(
    state.jobs
      .filter((job) => {
        const invoice = state.invoices.find((i) => i.jobId === job.id)
        return invoice && invoice.status !== 'draft' && monthKey(invoice.issued) === month
      })
      .map((job) => job.id),
  )
  const payrollMonth = round2(
    state.payLines.filter((l) => monthJobIds.has(l.jobId)).reduce((sum, l) => sum + payGross(l), 0),
  )
  const expenses = round2(
    state.expenses.filter((e) => monthKey(e.date) === month).reduce((sum, e) => sum + e.amount, 0),
  )

  const monthCommissions = round2(
    state.jobs.reduce((sum, job) => {
      const commission = commissionFor(job, state)
      const invoice = state.invoices.find((i) => i.jobId === job.id)
      if (!commission || !invoice || monthKey(invoice.issued) !== month) return sum
      if (state.commissionsPaid.includes(job.id)) return sum
      return sum + commission.amount
    }, 0),
  )

  const commissionsOwed = round2(
    state.jobs.reduce((sum, job) => {
      const commission = commissionFor(job, state)
      if (!commission || state.commissionsPaid.includes(job.id)) return sum
      return sum + commission.amount
    }, 0),
  )

  return {
    revenue,
    outstanding,
    overdueCount: overdue.length,
    overdueAmount,
    teamPayOwed,
    commissionsOwed,
    expenses,
    netProfit: round2(revenue - payrollMonth - expenses - monthCommissions),
    issuedCount: monthInvoices.length,
    unallocated: state.jobs.filter((j) => j.status === 'Booked').length,
    deliveredNotInvoiced: state.jobs.filter((j) => j.status === 'Delivered').length,
    drafts: state.invoices.filter((i) => i.status === 'draft').length,
  }
}

export interface WeekPoint {
  label: string
  revenue: number
  expenses: number
  start: string
}

export function weeklySeries(state: AppState, weeks = 6, today = todayISO()): WeekPoint[] {
  const current = startOfWeek(today)
  const points: WeekPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = startOfWeek(addDaysISO(current, -7 * i))
    const end = endOfWeek(start)
    const revenue = round2(
      state.invoices
        .filter((inv) => inv.status !== 'draft' && inv.issued >= start && inv.issued <= end)
        .reduce((sum, inv) => sum + invoiceSubtotal(inv), 0),
    )
    const expenses = round2(
      state.expenses.filter((e) => e.date >= start && e.date <= end).reduce((sum, e) => sum + e.amount, 0),
    )
    const label = new Date(`${start}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    points.push({ label, revenue, expenses, start })
  }
  return points
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysOverdue(inv: Invoice, today = todayISO()): number {
  if (inv.status !== 'sent' || inv.due >= today) return 0
  return daysBetween(inv.due, today)
}
