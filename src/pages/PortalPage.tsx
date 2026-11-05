import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronUp, MapPin, Wallet } from 'lucide-react'
import { useStore } from '../store'
import { Avatar, EmptyState, PayPill, StatusPill, shortTime } from '../components/ui'
import { payGross } from '../lib/calc'
import { addDays, endOfWeek, fmtDate, fmtWeek, monthKey, todayISO } from '../lib/dates'
import { money, round2 } from '../lib/format'
import type { PayLine } from '../types'

export function PortalPage() {
  const { state, role, setRole, staffOf } = useStore()
  const navigate = useNavigate()
  const today = todayISO()

  const person = role === 'admin' ? undefined : staffOf(role)
  const myJobs = person ? [...state.jobs].filter((job) => job.staff.includes(person.id)) : []
  myJobs.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
  const upcoming = myJobs.filter((job) => job.date >= today)
  const myLines = person ? state.payLines.filter((line) => line.staffId === person.id) : []
  const month = monthKey(today)
  const monthLines = myLines.filter((line) => monthKey(line.weekEnding) === month)
  const monthGross = round2(monthLines.reduce((sum, l) => sum + payGross(l), 0))

  const payslips = useMemo(() => {
    const map = new Map<string, PayLine[]>()
    myLines.forEach((line) => map.set(line.weekEnding, [...(map.get(line.weekEnding) ?? []), line]))
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [myLines])

  if (role === 'admin') {
    return (
      <div className="card" style={{ maxWidth: 620, margin: '8vh auto' }}>
        <div className="card-body" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 20, marginBottom: 6 }}>Employee portal</h1>
          <p className="small muted" style={{ marginBottom: 18 }}>
            Pick a team member in the <b>View as</b> menu. The sidebar hides all admin pages, and the portal shows only
            that person&apos;s jobs and payslips.
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {state.staff.map((staffMember, i) => (
              <button
                key={staffMember.id}
                className="score-row"
                style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onClick={() => setRole(staffMember.id)}
              >
                <Avatar name={staffMember.name} initials={staffMember.initials} tone={i + 1} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{staffMember.name}</div>
                  <div className="tiny faint">{staffMember.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="card">
        <EmptyState icon={<Wallet size={18} />} title="Team member not found">
          Choose another person in the role switcher.
        </EmptyState>
      </div>
    )
  }

  return (
    <>
      <div className="portal-hero">
        <Avatar name={person.name} initials={person.initials} large />
        <div>
          <h1>Hi {person.name.split(' ')[0]}</h1>
          <p>
            {person.role} · {person.remote ? 'Remote' : `${person.suburb} VIC`} · {upcoming.length} jobs ahead
          </p>
        </div>
        <div className="portal-earnings">
          <div className="label">Earnings this month</div>
          <div className="value">{money(monthGross)}</div>
          <div style={{ fontSize: 11, color: '#8fa4b1' }}>gross · super shown on payslips</div>
        </div>
      </div>

      <div className="kpi-grid kpi-3">
        <div className="kpi">
          <div className="kpi-label">Jobs this month</div>
          <div className="kpi-value">{myJobs.filter((j) => monthKey(j.date) === month).length}</div>
          <div className="kpi-meta">Assigned to you</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Next job</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>
            {upcoming[0] ? fmtDate(upcoming[0].date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'None booked'}
          </div>
          <div className="kpi-meta">{upcoming[0] ? `${upcoming[0].address}, ${upcoming[0].suburb}` : 'Check back soon'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Next pay day</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{fmtDate(endOfWeek(today), { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          <div className="kpi-meta">Weekly pay run</div>
        </div>
      </div>

      <div className="section-grid grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>My upcoming jobs</h2>
              <p>Address, services and start time</p>
            </div>
            <div className="card-tools">
              <span className="chip">{upcoming.length} ahead</span>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarDays size={18} />} title="No jobs booked yet">
                New allocations show here as soon as the office assigns you.
              </EmptyState>
            ) : (
              upcoming.map((job) => (
                <div key={job.id} className="portal-job">
                  <div className="date-badge">
                    <div className="m">{fmtDate(job.date, { month: 'short' })}</div>
                    <div className="d">{Number(job.date.slice(8))}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{job.address}</div>
                    <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <MapPin size={12} /> {job.suburb} · {shortTime(job.time)}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {job.services.map((id) => (
                        <span key={id} className="chip" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                          {state.services.find((s) => s.id === id)?.short}
                        </span>
                      ))}
                    </div>
                  </div>
                  <StatusPill status={job.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>My payslips</h2>
              <p>Weekly · gross and super</p>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            {payslips.length === 0 ? (
              <EmptyState icon={<Wallet size={18} />} title="No payslips yet">
                Payslip lines appear when a job is delivered.
              </EmptyState>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {payslips.map(([week, lines]) => (
                  <PayslipRow key={week} week={week} lines={lines} superPct={state.settings.superPct} hourly={person.payType === 'hourly'} />
                ))}
              </div>
            )}
            <div className="hint" style={{ marginTop: 12 }}>
              Questions about a payslip? Contact the office at accounts@southeastmedia.com.au.
            </div>
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/portal')}>
              <Wallet size={14} /> My dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function PayslipRow({ week, lines, superPct, hourly }: { week: string; lines: PayLine[]; superPct: number; hourly: boolean }) {
  const [open, setOpen] = useState(false)
  const gross = round2(lines.reduce((sum, l) => sum + payGross(l), 0))
  const superAmount = round2((gross * superPct) / 100)
  const paid = lines.every((l) => l.status === 'paid')

  return (
    <div className="pay-person" style={{ marginTop: 0 }}>
      <button
        className="pay-person-head"
        style={{ width: '100%', border: 0, background: '#fbfcfd', cursor: 'pointer', textAlign: 'left' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 650, fontSize: 13 }}>Week of {fmtWeek(addDays(week, -6))}</div>
          <div className="tiny faint">{lines.length} job{lines.length === 1 ? '' : 's'} · super {money(superAmount)}</div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 6 }}>
          <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(gross)}</div>
        </div>
        <PayPill status={paid ? 'paid' : 'pending'} />
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="pay-lines">
          {lines.map((line) => (
            <div key={line.id} className="pay-line">
              <div className="pl-desc">
                {line.description}
                <small>
                  {hourly ? `${line.hours} h @ ${money(line.rate)}/h` : `Per job · ${line.hours} h on site`}
                  {line.loading > 0 ? ` · includes ${money(line.loading)} weekend loading` : ''}
                </small>
              </div>
              <div className="pl-amt">{money(payGross(line))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
