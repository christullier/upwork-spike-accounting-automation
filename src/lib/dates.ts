const DAY = 86400000

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Monday-based start of the week that holds `s`. */
export function startOfWeek(s: string): string {
  const d = parseISO(s)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

export function endOfWeek(s: string): string {
  return addDays(startOfWeek(s), 6)
}

export function isWeekend(s: string): boolean {
  const dow = parseISO(s).getDay()
  return dow === 0 || dow === 6
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / DAY)
}

export function monthKey(s: string): string {
  return s.slice(0, 7)
}

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return parseISO(s).toLocaleDateString('en-AU', opts)
}

export function fmtLongDate(s: string): string {
  return parseISO(s).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function fmtWeek(startISO: string): string {
  const end = addDays(startISO, 6)
  const sameMonth = startISO.slice(0, 7) === end.slice(0, 7)
  const left = parseISO(startISO).toLocaleDateString('en-AU', { day: 'numeric', month: sameMonth ? undefined : 'short' })
  const right = parseISO(end).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  return `${left} – ${right}`
}

export function weekdayShort(s: string): string {
  return parseISO(s).toLocaleDateString('en-AU', { weekday: 'short' })
}

export function daysInMonth(monthISO: string): number {
  const [y, m] = monthISO.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function monthLabel(monthISO: string): string {
  return parseISO(`${monthISO}-01`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}
