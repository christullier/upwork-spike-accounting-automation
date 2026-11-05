export type Skill = 'photo' | 'drone' | 'video' | 'plan' | 'editor'

export interface Service {
  id: string
  name: string
  short: string
  /** Client price, GST excluded. */
  price: number
  /** Team pay for the job, GST excluded. */
  pay: number
  skill: Skill
  /** Hours a job of this type takes on site. */
  hours: number
  /** Editor hours created when this service is delivered. */
  editHours?: number
}

export interface Client {
  id: string
  name: string
  agent: string
  email: string
  suburb: string
  commissionPct: number
}

export interface Staff {
  id: string
  name: string
  role: string
  initials: string
  skills: Skill[]
  suburb: string
  remote?: boolean
  payType: 'per_job' | 'hourly'
  hourlyRate: number
  weekendLoadingPct: number
  unavailable: string[]
}

export type JobStatus = 'Booked' | 'Allocated' | 'Shot' | 'Delivered' | 'Invoiced' | 'Paid'

export interface Job {
  id: string
  ref: string
  clientId: string
  address: string
  suburb: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  time: string
  services: string[]
  status: JobStatus
  staff: string[]
  invoiceId?: string
  notes?: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface InvoiceLine {
  serviceId?: string
  description: string
  qty: number
  unitPrice: number
}

export interface Invoice {
  id: string
  number: string
  jobId?: string
  clientId: string
  issued: string
  due: string
  lines: InvoiceLine[]
  status: InvoiceStatus
  paidDate?: string
}

export interface PayLine {
  id: string
  jobId: string
  staffId: string
  description: string
  base: number
  loading: number
  hours: number
  rate: number
  /** ISO date of the Sunday that ends the pay week. */
  weekEnding: string
  status: 'pending' | 'paid'
}

export interface Expense {
  id: string
  date: string
  category: string
  vendor: string
  amount: number
  note?: string
}

export interface Settings {
  gstPct: number
  superPct: number
  paymentTermsDays: number
}

export interface Company {
  name: string
  abn: string
  address: string
  email: string
  phone: string
}

export interface AppState {
  version: number
  company: Company
  settings: Settings
  services: Service[]
  clients: Client[]
  staff: Staff[]
  jobs: Job[]
  invoices: Invoice[]
  payLines: PayLine[]
  expenses: Expense[]
  commissionsPaid: string[]
}

export type Role = 'admin' | string
