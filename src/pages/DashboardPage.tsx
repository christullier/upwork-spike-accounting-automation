import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, CalendarClock, CircleDollarSign, ClipboardList, ReceiptText, TriangleAlert, Wallet } from 'lucide-react'
import { useStore } from '../store'
import { dashboardTotals, invoiceTotals, weeklySeries } from '../lib/calc'
import { daysOverdue } from '../lib/calc'
import { fmtDate, fmtLongDate, monthLabel, todayISO } from '../lib/dates'
import { money } from '../lib/format'
import { StatusPill, shortTime } from '../components/ui'

export function DashboardPage() {
  const { state, clientOf } = useStore()
  const navigate = useNavigate()
  const today = todayISO()
  const totals = dashboardTotals(state, today)
  const weeks = weeklySeries(state, 6, today)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const open = state.invoices.filter((i) => i.status === 'sent')
  const overdue = open.filter((i) => daysOverdue(i, today) > 0)
  const drafts = state.invoices.filter((i) => i.status === 'draft')
  const unallocated = state.jobs.filter((j) => j.status === 'Booked')

  const upcoming = [...state.jobs]
    .filter((j) => j.date >= today && j.status !== 'Paid')
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
    .slice(0, 5)

  const chartData = weeks.map((w) => ({ ...w, revenue: w.revenue, expenses: w.expenses }))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting}, Alex</h1>
          <p>
            {fmtLongDate(today)} · {monthLabel(today.slice(0, 7))} to date
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('/calendar')}>
            <CalendarClock size={15} /> Open calendar
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
            <ClipboardList size={15} /> Manage jobs
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Revenue this month</div>
          <div className="kpi-value">{money(totals.revenue)}</div>
          <div className="kpi-meta">{totals.issuedCount} invoices issued · ex GST</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value">{money(totals.outstanding)}</div>
          <div className="kpi-meta">{open.length} invoices awaiting payment</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Overdue</div>
          <div className={`kpi-value ${totals.overdueCount > 0 ? 'neg' : ''}`}>{money(totals.overdueAmount)}</div>
          <div className={`kpi-meta ${totals.overdueCount > 0 ? 'bad' : 'good'}`}>
            {totals.overdueCount} invoice{totals.overdueCount === 1 ? '' : 's'} past due
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Team pay owed</div>
          <div className="kpi-value">{money(totals.teamPayOwed)}</div>
          <div className="kpi-meta">Pending this pay run</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Commissions owed</div>
          <div className="kpi-value">{money(totals.commissionsOwed)}</div>
          <div className="kpi-meta">Agent referrals · ex GST</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Net profit</div>
          <div className={`kpi-value ${totals.netProfit < 0 ? 'neg' : ''}`}>{money(totals.netProfit)}</div>
          <div className="kpi-meta">After pay, expenses and commission</div>
        </div>
      </div>

      <div className="section-grid grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Revenue vs expenses</h2>
              <p>Last six weeks, GST excluded</p>
            </div>
            <div className="card-tools chart-legend">
              <span>
                <i className="legend-dot" style={{ background: '#0f766e' }} />
                Revenue
              </span>
              <span>
                <i className="legend-dot" style={{ background: '#cbd5e1' }} />
                Expenses
              </span>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={chartData} barGap={4} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#98a1ae' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10.5, fill: '#98a1ae' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(15, 118, 110, 0.05)' }}
                  formatter={(value: number, name: string) => [money(value), name === 'revenue' ? 'Revenue' : 'Expenses']}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e4e8ee',
                    boxShadow: '0 12px 30px -12px rgba(15,23,42,.25)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="expenses" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Needs attention</h2>
              <p>Work the automation has queued for you</p>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 6 }}>
            <div className="attention-item">
              <div className="attention-icon red">
                <TriangleAlert />
              </div>
              <div className="attention-main">
                <div className="attention-title">
                  {overdue.length} overdue invoice{overdue.length === 1 ? '' : 's'}
                </div>
                <div className="attention-sub">
                  {overdue.length > 0
                    ? `${money(overdue.reduce((s, i) => s + invoiceTotals(i, state.settings.gstPct).total, 0))} past due · oldest ${Math.max(...overdue.map((i) => daysOverdue(i, today)))} days`
                    : 'All invoices are inside terms'}
                </div>
              </div>
              <button className="btn btn-xs" onClick={() => navigate('/invoices')}>
                View
              </button>
            </div>

            <div className="attention-item">
              <div className="attention-icon blue">
                <ClipboardList />
              </div>
              <div className="attention-main">
                <div className="attention-title">{unallocated.length} jobs not allocated</div>
                <div className="attention-sub">Smart Allocate scores skill, availability and travel</div>
              </div>
              <button className="btn btn-xs" onClick={() => navigate('/jobs?status=Booked')}>
                Allocate
              </button>
            </div>

            <div className="attention-item">
              <div className="attention-icon">
                <ReceiptText />
              </div>
              <div className="attention-main">
                <div className="attention-title">{drafts.length} delivered jobs in draft</div>
                <div className="attention-sub">Invoices are built and waiting to send</div>
              </div>
              <button className="btn btn-xs" onClick={() => navigate('/invoices?status=draft')}>
                Review
              </button>
            </div>

            <div className="attention-item">
              <div className="attention-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
                <Wallet />
              </div>
              <div className="attention-main">
                <div className="attention-title">Pay run ready</div>
                <div className="attention-sub">{money(totals.teamPayOwed)} pending for the current week</div>
              </div>
              <button className="btn btn-xs" onClick={() => navigate('/pay')}>
                Pay
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section-grid grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Next up</h2>
              <p>Booked and allocated jobs, earliest first</p>
            </div>
            <div className="card-tools">
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/jobs')}>
                All jobs <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>When</th>
                  <th className="hide-sm">Client</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((job) => (
                  <tr key={job.id} className="clickable" onClick={() => navigate(`/jobs?job=${job.id}`)}>
                    <td>
                      <div className="cell-main">{job.address}</div>
                      <div className="cell-sub">{job.suburb} · {job.ref}</div>
                    </td>
                    <td>
                      <div className="cell-main" style={{ fontWeight: 500 }}>
                        {fmtDate(job.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="cell-sub">{shortTime(job.time)}</div>
                    </td>
                    <td className="hide-sm">{clientOf(job.clientId)?.name}</td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="howto">
          <h2>How to try the automation</h2>
          <p>A two-minute path through the whole job lifecycle.</p>
          <ol>
            <li>
              <span>
                Open <b>Calendar</b> and add a booking. It lands as <b>Booked</b>.
              </span>
            </li>
            <li>
              <span>
                In <b>Jobs</b>, run <b>Smart Allocate</b> to rank the team.
              </span>
            </li>
            <li>
              <span>
                Advance to <b>Delivered</b>. The invoice and pay lines build themselves.
              </span>
            </li>
            <li>
              <span>
                Check <b>Invoices</b> and <b>Team &amp; Pay</b> to see the money. Then switch to a staff portal.
              </span>
            </li>
          </ol>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5, color: '#8fa4b1' }}>
            <CircleDollarSign size={14} /> Rates, GST and commission are editable in Settings.
          </div>
        </div>
      </div>
    </>
  )
}
