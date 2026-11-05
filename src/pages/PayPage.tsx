import { useMemo, useState } from 'react'
import { Check, HandCoins, Wallet } from 'lucide-react'
import { useStore } from '../store'
import { Avatar, EmptyState, PayPill } from '../components/ui'
import { commissionFor, invoiceSubtotal, payGross } from '../lib/calc'
import { addDays, endOfWeek, fmtDate, fmtWeek, todayISO } from '../lib/dates'
import { money, pct, round2 } from '../lib/format'
import type { PayLine } from '../types'

export function PayPage() {
  const { state, approvePayRun, payCommission, staffOf } = useStore()
  const today = todayISO()
  const currentWeek = endOfWeek(today)

  const weeks = useMemo(() => {
    const set = new Set(state.payLines.map((l) => l.weekEnding))
    set.add(currentWeek)
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1))
  }, [state.payLines, currentWeek])

  const [week, setWeek] = useState<string>(() => {
    const pending = state.payLines.filter((l) => l.status === 'pending').sort((a, b) => (a.weekEnding < b.weekEnding ? 1 : -1))
    return pending[0]?.weekEnding ?? currentWeek
  })

  const lines = state.payLines.filter((l) => l.weekEnding === week)
  const pending = lines.filter((l) => l.status === 'pending')
  const gross = round2(lines.reduce((sum, l) => sum + payGross(l), 0))
  const superAmount = round2((gross * state.settings.superPct) / 100)
  const jobs = new Set(lines.map((l) => l.jobId)).size

  const byPerson = useMemo(() => {
    const map = new Map<string, PayLine[]>()
    lines.forEach((line) => {
      map.set(line.staffId, [...(map.get(line.staffId) ?? []), line])
    })
    return Array.from(map.entries()).sort((a, b) => {
      const an = staffOf(a[0])?.name ?? ''
      const bn = staffOf(b[0])?.name ?? ''
      return an.localeCompare(bn)
    })
  }, [lines, staffOf])

  const weekLabel = (w: string) => `${fmtWeek(addDays(w, -6))}${w === currentWeek ? ' · current' : ''}`

  const commissionRows = useMemo(() => {
    return state.jobs
      .map((job) => {
        const invoice = state.invoices.find((i) => i.jobId === job.id)
        const commission = commissionFor(job, state)
        if (!invoice || !commission) return null
        return {
          job,
          invoice,
          client: state.clients.find((c) => c.id === job.clientId),
          paid: state.commissionsPaid.includes(job.id),
          base: invoiceSubtotal(invoice),
          amount: commission.amount,
          pctValue: commission.pct,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => (a.job.date < b.job.date ? 1 : -1))
  }, [state])

  const commissionOwed = round2(commissionRows.filter((r) => !r.paid).reduce((sum, r) => sum + r.amount, 0))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Team &amp; Pay</h1>
          <p>Payslips built from delivered jobs. Approve the run when the week is closed.</p>
        </div>
        <div className="page-actions">
          <select className="select" style={{ width: 'auto', minWidth: 250 }} value={week} onChange={(e) => setWeek(e.target.value)}>
            {weeks.map((w) => (
              <option key={w} value={w}>
                {weekLabel(w)}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={pending.length === 0} onClick={() => approvePayRun(week)}>
            <Check size={15} /> {pending.length === 0 ? 'Pay run approved' : `Approve pay run · ${money(pending.reduce((s, l) => s + payGross(l), 0))}`}
          </button>
        </div>
      </div>

      <div className="kpi-grid kpi-4">
        <div className="kpi">
          <div className="kpi-label">Gross pay</div>
          <div className="kpi-value">{money(gross)}</div>
          <div className="kpi-meta">{jobs} jobs · {lines.length} pay lines</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Super {pct(state.settings.superPct)}</div>
          <div className="kpi-value">{money(superAmount)}</div>
          <div className="kpi-meta">Paid on top of gross</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total cost</div>
          <div className="kpi-value">{money(gross + superAmount)}</div>
          <div className="kpi-meta">Gross plus super</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Run status</div>
          <div className="kpi-value" style={{ fontSize: 19 }}>
            {pending.length === 0 ? 'Approved' : `${pending.length} pending`}
          </div>
          <div className={`kpi-meta ${pending.length === 0 ? 'good' : 'warn'}`}>
            {pending.length === 0 ? 'All lines paid for this week' : 'Waiting for approval'}
          </div>
        </div>
      </div>

      <div className="section-grid grid-2">
        <div>
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 14 }}>
              <div>
                <h2>Payslips</h2>
                <p>{fmtWeek(addDays(week, -6))} · weekly period</p>
              </div>
              <div className="card-tools">
                <span className="chip">{byPerson.length} team members</span>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              {byPerson.length === 0 ? (
                <EmptyState icon={<Wallet size={18} />} title="No pay lines in this week">
                  Deliver a job to create payslip lines.
                </EmptyState>
              ) : (
                byPerson.map(([staffId, personLines], index) => {
                  const person = staffOf(staffId)
                  if (!person) return null
                  const personGross = round2(personLines.reduce((sum, l) => sum + payGross(l), 0))
                  const personSuper = round2((personGross * state.settings.superPct) / 100)
                  const isPaid = personLines.every((l) => l.status === 'paid')
                  const loading = round2(personLines.reduce((sum, l) => sum + l.loading, 0))
                  return (
                    <div key={staffId} className="pay-person" style={{ marginTop: index === 0 ? 0 : 12 }}>
                      <div className="pay-person-head">
                        <Avatar name={person.name} initials={person.initials} tone={index + 1} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 650 }}>{person.name}</div>
                          <div className="tiny faint">
                            {person.role} · {person.payType === 'hourly' ? `${money(person.hourlyRate)}/h` : 'Per job'}
                          </div>
                        </div>
                        {loading > 0 && <span className="chip amber" style={{ fontSize: 10.5 }}>+{money(loading)} weekend</span>}
                        <PayPill status={isPaid ? 'paid' : 'pending'} />
                      </div>
                      <div className="pay-lines">
                        {personLines.map((line) => (
                          <div key={line.id} className="pay-line">
                            <div className="pl-desc">
                              {line.description}
                              <small>
                                {person.payType === 'hourly'
                                  ? `${line.hours} h @ ${money(line.rate)}/h`
                                  : `Per job · ${line.hours} h on site`}
                                {line.loading > 0 ? ` · includes ${money(line.loading)} loading` : ''}
                              </small>
                            </div>
                            <div className="pl-amt">{money(payGross(line))}</div>
                          </div>
                        ))}
                      </div>
                      <div className="super-line">
                        <span>Super {state.settings.superPct}% (info)</span>
                        <span className="mono">{money(personSuper)}</span>
                      </div>
                      <div className="pay-foot">
                        <span className="muted">Total cost incl. super</span>
                        <strong>{money(personGross + personSuper)}</strong>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Agent commissions</h2>
                <p>Referral fees on issued invoices</p>
              </div>
              <div className="card-tools">
                <span className={`chip ${commissionOwed > 0 ? 'amber' : 'accent'}`}>{money(commissionOwed)} owed</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client / agent</th>
                    <th className="hide-sm">Job</th>
                    <th className="num hide-sm">Revenue</th>
                    <th className="num">Fee</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {commissionRows.map((row) => (
                    <tr key={row.job.id}>
                      <td>
                        <div className="cell-main" style={{ fontSize: 12.5 }}>{row.client?.name}</div>
                        <div className="cell-sub">
                          {row.client?.agent} · {pct(row.pctValue)}
                        </div>
                      </td>
                      <td className="hide-sm">
                        <div className="small" style={{ whiteSpace: 'nowrap' }}>{row.job.ref}</div>
                        <div className="cell-sub">{fmtDate(row.job.date, { day: 'numeric', month: 'short' })}</div>
                      </td>
                      <td className="num hide-sm">{money(row.base)}</td>
                      <td className="num cell-mono">{money(row.amount)}</td>
                      <td>
                        {row.amount === 0 ? (
                          <span className="tiny faint">No fee</span>
                        ) : row.paid ? (
                          <span className="chip accent" style={{ fontSize: 10.5 }}>Paid</span>
                        ) : (
                          <button className="btn btn-xs" onClick={() => payCommission(row.job.id)}>
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commissionRows.length === 0 && (
                <EmptyState icon={<HandCoins size={18} />} title="No commissions yet">
                  Invoices with a referral fee appear here.
                </EmptyState>
              )}
            </div>
          </div>

          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 8 }}>How pay is worked out</div>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 16, lineHeight: 1.75 }}>
              <li>Each service pays the assigned person who holds the skill.</li>
              <li>Weekend jobs add the person&apos;s weekend loading (Mia: 10%).</li>
              <li>Video jobs add editor hours at the hourly rate.</li>
              <li>Super {state.settings.superPct}% is shown for information and paid on top.</li>
            </ul>
            <div className="hint" style={{ marginTop: 10 }}>
              Pay rates live in Settings. Pending lines recalculate when a rate changes.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
