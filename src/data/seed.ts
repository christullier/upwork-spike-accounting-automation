import type { AppState, Client, Company, Expense, Invoice, Job, JobStatus, PayLine, Service, Settings, Staff } from '../types'
import { addDays, endOfWeek, parseISO, startOfWeek, todayISO } from '../lib/dates'
import { linesForJob, payLinesFor } from '../lib/calc'

export const SEED_VERSION = 3

export const COMPANY: Company = {
  name: 'Southeast Media Co.',
  abn: '48 612 907 331',
  address: '7 Enterprise Way, Clyde North VIC 3978',
  email: 'accounts@southeastmedia.com.au',
  phone: '(03) 8765 2210',
}

export const SERVICES: Service[] = [
  { id: 'svc-photos', name: 'Property Photos (25 images)', short: 'Photos', price: 280, pay: 120, skill: 'photo', hours: 1.5 },
  { id: 'svc-drone', name: 'Drone Stills (8 images)', short: 'Drone', price: 180, pay: 70, skill: 'drone', hours: 1 },
  { id: 'svc-video', name: 'Walkthrough Video', short: 'Video', price: 450, pay: 200, skill: 'video', hours: 2, editHours: 3.5 },
  { id: 'svc-plan', name: 'Floor Plan', short: 'Plan', price: 150, pay: 45, skill: 'plan', hours: 1 },
  { id: 'svc-twilight', name: 'Twilight Shoot', short: 'Twilight', price: 320, pay: 140, skill: 'photo', hours: 1.5 },
]

export const CLIENTS: Client[] = [
  { id: 'cl-raywhite', name: 'Ray White Berwick', agent: 'Daniel Rossi', email: 'daniel.rossi@raywhiteberwick.com.au', suburb: 'Berwick', commissionPct: 5 },
  { id: 'cl-harcourts', name: 'Harcourts Clyde North', agent: 'Priya Nair', email: 'priya.nair@harcourtsclydenorth.com.au', suburb: 'Clyde North', commissionPct: 5 },
  { id: 'cl-barryplant', name: 'Barry Plant Cranbourne', agent: 'Mark Ellery', email: 'mark.ellery@barryplantcranbourne.com.au', suburb: 'Cranbourne', commissionPct: 0 },
  { id: 'cl-obrien', name: 'OBrien Real Estate Officer', agent: 'Sophie Tran', email: 'sophie.tran@obrienofficer.com.au', suburb: 'Officer', commissionPct: 3 },
]

export function buildStaff(today = todayISO()): Staff[] {
  const d = (n: number) => addDays(today, n)
  return [
    {
      id: 'st-jaspreet',
      name: 'Jaspreet Singh',
      role: 'Photographer',
      initials: 'JS',
      skills: ['photo', 'drone'],
      suburb: 'Clyde North',
      payType: 'per_job',
      hourlyRate: 0,
      weekendLoadingPct: 0,
      unavailable: [d(5), d(7)],
    },
    {
      id: 'st-mia',
      name: 'Mia Chen',
      role: 'Videographer',
      initials: 'MC',
      skills: ['video', 'photo'],
      suburb: 'Berwick',
      payType: 'per_job',
      hourlyRate: 0,
      weekendLoadingPct: 10,
      unavailable: [d(2)],
    },
    {
      id: 'st-tom',
      name: 'Tom Walsh',
      role: 'Floor plan technician',
      initials: 'TW',
      skills: ['plan', 'photo'],
      suburb: 'Cranbourne',
      payType: 'per_job',
      hourlyRate: 0,
      weekendLoadingPct: 0,
      unavailable: [d(6)],
    },
    {
      id: 'st-aisha',
      name: 'Aisha Rahman',
      role: 'Editor',
      initials: 'AR',
      skills: ['editor'],
      suburb: 'Remote',
      remote: true,
      payType: 'hourly',
      hourlyRate: 38,
      weekendLoadingPct: 0,
      unavailable: [d(3)],
    },
  ]
}

export const SETTINGS: Settings = { gstPct: 10, superPct: 11.5, paymentTermsDays: 14 }

interface JobSpec {
  day: number
  /** Optional exact date, used for weekend jobs. */
  date?: string
  time: string
  clientId: string
  address: string
  suburb: string
  services: string[]
  status: JobStatus
  staff: string[]
  notes?: string
}

export function buildSeed(): AppState {
  const today = todayISO()
  const staff = buildStaff(today)
  const d = (n: number) => addDays(today, n)
  const monthStart = `${today.slice(0, 8)}01`
  /** A date in the current month, so month-to-date figures always have data. */
  const recent = (n: number) => {
    const target = addDays(today, -n)
    return target < monthStart ? monthStart : target
  }

  const lastSaturday = (() => {
    const dow = parseISO(today).getDay()
    return addDays(today, dow === 6 ? 0 : -(dow + 1))
  })()

  const specs: JobSpec[] = [
    // Recent jobs, already paid. Dates stay inside the current month.
    { day: 0, date: recent(6), time: '09:00', clientId: 'cl-raywhite', address: '14 Paperbark Rise', suburb: 'Clyde North', services: ['svc-photos', 'svc-drone'], status: 'Paid', staff: ['st-jaspreet'] },
    { day: 0, date: recent(4), time: '15:30', clientId: 'cl-harcourts', address: '8 Sedgefield Way', suburb: 'Berwick', services: ['svc-video', 'svc-photos'], status: 'Paid', staff: ['st-mia'] },
    { day: 0, date: recent(2), time: '11:30', clientId: 'cl-barryplant', address: '31 Tulliallan Blvd', suburb: 'Cranbourne', services: ['svc-plan', 'svc-photos'], status: 'Paid', staff: ['st-tom', 'st-jaspreet'] },
    // Issued invoices, three are overdue.
    { day: -20, time: '17:00', clientId: 'cl-obrien', address: '12 Arcadia Ave', suburb: 'Officer', services: ['svc-twilight'], status: 'Invoiced', staff: ['st-mia'] },
    { day: -18, time: '09:30', clientId: 'cl-raywhite', address: '5 Harkaway Gr', suburb: 'Berwick', services: ['svc-photos', 'svc-plan'], status: 'Invoiced', staff: ['st-jaspreet', 'st-tom'] },
    { day: -16, time: '11:00', clientId: 'cl-harcourts', address: '27 Grandvue Blvd', suburb: 'Clyde North', services: ['svc-photos', 'svc-drone', 'svc-plan'], status: 'Invoiced', staff: ['st-jaspreet', 'st-tom'] },
    { day: -9, time: '13:30', clientId: 'cl-barryplant', address: '17 Scarborough Dr', suburb: 'Cranbourne', services: ['svc-video'], status: 'Invoiced', staff: ['st-mia'] },
    // Shot and delivered, waiting on the office.
    { day: -2, time: '09:00', clientId: 'cl-raywhite', address: '19 Wattlebird Cct', suburb: 'Clyde North', services: ['svc-photos'], status: 'Delivered', staff: ['st-jaspreet'] },
    { day: -1, time: '11:30', clientId: 'cl-harcourts', address: '44 Cascade Dr', suburb: 'Officer', services: ['svc-drone', 'svc-photos'], status: 'Delivered', staff: ['st-jaspreet'] },
    { day: 0, date: lastSaturday, time: '15:00', clientId: 'cl-obrien', address: '41 Heritage Blvd', suburb: 'Officer', services: ['svc-video', 'svc-photos'], status: 'Delivered', staff: ['st-mia'] },
    { day: -1, time: '16:00', clientId: 'cl-obrien', address: '41 Heritage Blvd', suburb: 'Officer', services: ['svc-twilight'], status: 'Shot', staff: ['st-mia'] },
    // This week and next two weeks.
    { day: 0, time: '10:30', clientId: 'cl-raywhite', address: '23 Elliston Way', suburb: 'Clyde North', services: ['svc-photos', 'svc-plan'], status: 'Allocated', staff: ['st-jaspreet', 'st-tom'] },
    { day: 1, time: '09:00', clientId: 'cl-harcourts', address: '6 Dandelion Cl', suburb: 'Clyde North', services: ['svc-drone', 'svc-photos'], status: 'Allocated', staff: ['st-jaspreet'] },
    { day: 1, time: '14:00', clientId: 'cl-barryplant', address: '3 Merribrook Way', suburb: 'Narre Warren', services: ['svc-video'], status: 'Booked', staff: [] },
    { day: 2, time: '10:00', clientId: 'cl-obrien', address: '11 Bellamy Pl', suburb: 'Officer', services: ['svc-photos', 'svc-drone'], status: 'Allocated', staff: ['st-jaspreet'] },
    { day: 3, time: '15:30', clientId: 'cl-raywhite', address: '9 Kestrel Rise', suburb: 'Berwick', services: ['svc-video', 'svc-photos'], status: 'Allocated', staff: ['st-mia'] },
    { day: 5, time: '09:30', clientId: 'cl-harcourts', address: '28 Oaktree Gr', suburb: 'Berwick', services: ['svc-photos'], status: 'Booked', staff: [] },
    { day: 6, time: '12:00', clientId: 'cl-barryplant', address: '55 Windermere Blvd', suburb: 'Clyde North', services: ['svc-plan', 'svc-photos'], status: 'Booked', staff: [] },
    { day: 8, time: '17:30', clientId: 'cl-raywhite', address: '62 Botanical Ave', suburb: 'Pakenham', services: ['svc-twilight'], status: 'Allocated', staff: ['st-mia'] },
    { day: 10, time: '10:00', clientId: 'cl-obrien', address: '2 Ferndale Ct', suburb: 'Officer', services: ['svc-video', 'svc-plan'], status: 'Booked', staff: [] },
    { day: 12, time: '09:00', clientId: 'cl-harcourts', address: '18 Riverbend Dr', suburb: 'Clyde North', services: ['svc-photos', 'svc-drone', 'svc-video'], status: 'Booked', staff: [] },
  ]

  const jobs: Job[] = specs.map((spec, i) => {
    const date = spec.date ?? d(spec.day)
    return {
      id: `job-${1001 + i}`,
      ref: `JOB-${1042 + i}`,
      clientId: spec.clientId,
      address: spec.address,
      suburb: spec.suburb,
      date,
      time: spec.time,
      services: spec.services,
      status: spec.status,
      staff: spec.staff,
      notes: spec.notes,
    }
  })

  const invoices: Invoice[] = []

  // Archived invoices keep the six-week chart realistic.
  const archive: Array<{ number: string; clientId: string; issued: string; paid: string; lines: Invoice['lines'] }> = [
    {
      number: 'INV-1028',
      clientId: 'cl-raywhite',
      issued: d(-40),
      paid: d(-31),
      lines: [
        { serviceId: 'svc-photos', description: 'Property Photos (25 images)', qty: 2, unitPrice: 280 },
        { serviceId: 'svc-drone', description: 'Drone Stills (8 images)', qty: 1, unitPrice: 180 },
      ],
    },
    {
      number: 'INV-1029',
      clientId: 'cl-harcourts',
      issued: d(-37),
      paid: d(-28),
      lines: [
        { serviceId: 'svc-video', description: 'Walkthrough Video', qty: 1, unitPrice: 450 },
        { serviceId: 'svc-photos', description: 'Property Photos (25 images)', qty: 1, unitPrice: 280 },
      ],
    },
    {
      number: 'INV-1030',
      clientId: 'cl-barryplant',
      issued: d(-34),
      paid: d(-24),
      lines: [
        { serviceId: 'svc-plan', description: 'Floor Plan', qty: 1, unitPrice: 150 },
        { serviceId: 'svc-photos', description: 'Property Photos (25 images)', qty: 1, unitPrice: 280 },
        { serviceId: 'svc-twilight', description: 'Twilight Shoot', qty: 1, unitPrice: 320 },
      ],
    },
    {
      number: 'INV-1031',
      clientId: 'cl-obrien',
      issued: d(-31),
      paid: d(-20),
      lines: [{ serviceId: 'svc-photos', description: 'Property Photos (25 images)', qty: 3, unitPrice: 280 }],
    },
  ]

  archive.forEach((a, i) => {
    invoices.push({
      id: `inv-archive-${i + 1}`,
      number: a.number,
      clientId: a.clientId,
      issued: a.issued,
      due: addDays(a.issued, SETTINGS.paymentTermsDays),
      lines: a.lines,
      status: 'paid',
      paidDate: a.paid,
    })
  })

  const billable = jobs.filter((j) => ['Delivered', 'Invoiced', 'Paid'].includes(j.status))
  billable.sort((a, b) => (a.date < b.date ? -1 : 1))
  billable.forEach((job, i) => {
    const number = `INV-${1032 + i}`
    const issued = job.date
    const status = job.status === 'Paid' ? 'paid' : job.status === 'Invoiced' ? 'sent' : 'draft'
    const invoice: Invoice = {
      id: `inv-${job.id}`,
      number,
      jobId: job.id,
      clientId: job.clientId,
      issued,
      due: addDays(issued, SETTINGS.paymentTermsDays),
      lines: linesForJob(job, SERVICES),
      status,
      paidDate: status === 'paid' ? (addDays(issued, 5) > today ? today : addDays(issued, 5)) : undefined,
    }
    invoices.push(invoice)
    job.invoiceId = invoice.id
  })

  const currentWeekStart = startOfWeek(today)
  const payLines: PayLine[] = []
  billable.forEach((job) => {
    payLinesFor(job, staff, SERVICES).forEach((draft, i) => {
      const paid = job.date < currentWeekStart
      payLines.push({
        id: `pl-${job.id}-${i}`,
        jobId: job.id,
        staffId: draft.staffId,
        description: draft.description,
        base: draft.base,
        loading: draft.loading,
        hours: draft.hours,
        rate: draft.rate,
        weekEnding: endOfWeek(job.date),
        status: paid ? 'paid' : 'pending',
      })
    })
  })

  const expenses: Expense[] = [
    { id: 'ex-1', date: d(-2), category: 'Fuel', vendor: 'BP Clyde North', amount: 96.4, note: 'Two shoot days' },
    { id: 'ex-2', date: d(-6), category: 'Software', vendor: 'Dropbox Business', amount: 33, note: 'Monthly plan' },
    { id: 'ex-3', date: d(-11), category: 'Insurance', vendor: 'Coverdrone Australia', amount: 185, note: 'Drone hull cover' },
    { id: 'ex-4', date: d(-14), category: 'Software', vendor: 'Adobe Creative Cloud', amount: 87.99 },
    { id: 'ex-5', date: d(-17), category: 'Repairs', vendor: 'Camera Clinic Melbourne', amount: 240, note: '24-70 mm lens service' },
    { id: 'ex-6', date: d(-21), category: 'Fuel', vendor: 'Ampol Officer', amount: 88.2 },
    { id: 'ex-7', date: d(-25), category: 'Software', vendor: 'Squarespace', amount: 29, note: 'Website hosting' },
    { id: 'ex-8', date: d(-29), category: 'Equipment', vendor: 'Officeworks', amount: 164, note: 'SD cards and card reader' },
    { id: 'ex-9', date: d(-35), category: 'Phone', vendor: 'Telstra', amount: 65 },
  ]

  return {
    version: SEED_VERSION,
    company: COMPANY,
    settings: { ...SETTINGS },
    services: SERVICES.map((s) => ({ ...s })),
    clients: CLIENTS.map((c) => ({ ...c })),
    staff,
    jobs,
    invoices,
    payLines,
    expenses,
    commissionsPaid: [],
  }
}
