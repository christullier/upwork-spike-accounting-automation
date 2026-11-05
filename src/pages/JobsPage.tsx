import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, FileText, Search, Sparkles, UserPlus, Wand2 } from 'lucide-react'
import { useStore, STATUS_ORDER } from '../store'
import { Avatar, Drawer, EmptyState, Modal, StatusPill, shortTime } from '../components/ui'
import {
  commissionOnSubtotal,
  invoiceTotals,
  jobSubtotal,
  jobTeamPay,
  requiredSkills,
  scoreStaff,
  serviceById,
} from '../lib/calc'
import { fmtDate } from '../lib/dates'
import { money, pct, round2 } from '../lib/format'
import type { Job, JobStatus } from '../types'

const FILTERS: Array<JobStatus | 'All'> = ['All', 'Booked', 'Allocated', 'Shot', 'Delivered', 'Invoiced', 'Paid']

export function JobsPage() {
  const { state, clientOf } = useStore()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const status = (params.get('status') as JobStatus | 'All' | null) ?? 'All'
  const selectedId = params.get('job')
  const selected = state.jobs.find((j) => j.id === selectedId) ?? null

  const setStatus = (value: JobStatus | 'All') => {
    const next = new URLSearchParams(params)
    if (value === 'All') next.delete('status')
    else next.set('status', value)
    next.delete('job')
    setParams(next, { replace: true })
  }

  const openJob = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('job', id)
    setParams(next)
  }

  const closeJob = () => {
    const next = new URLSearchParams(params)
    next.delete('job')
    setParams(next, { replace: true })
  }

  const jobs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.jobs]
      .filter((job) => (status === 'All' ? true : job.status === status))
      .filter((job) => {
        if (!q) return true
        const client = state.clients.find((c) => c.id === job.clientId)
        return [job.address, job.suburb, job.ref, client?.name, client?.agent]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
  }, [state.jobs, state.clients, status, query])

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: state.jobs.length }
    state.jobs.forEach((j) => {
      map[j.status] = (map[j.status] ?? 0) + 1
    })
    return map
  }, [state.jobs])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Jobs</h1>
          <p>Every job from booking to payment. Open a job to allocate, deliver and invoice it.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('/calendar')}>
            <UserPlus size={15} /> Book a job
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input
              className="input"
              placeholder="Search address, client or job"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {FILTERS.map((f) => (
              <button key={f} className={`filter-pill ${status === f ? 'on' : ''}`} onClick={() => setStatus(f)}>
                {f}
                {counts[f] ? <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[f]}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Client</th>
                <th>Date</th>
                <th>Services</th>
                <th>Crew</th>
                <th className="num">Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const client = clientOf(job.clientId)
                const value = jobSubtotal(job, state.services)
                return (
                  <tr key={job.id} className="clickable" onClick={() => openJob(job.id)}>
                    <td>
                      <div className="cell-main">{job.address}</div>
                      <div className="cell-sub">
                        {job.suburb} · {job.ref}
                      </div>
                    </td>
                    <td>
                      <div>{client?.name}</div>
                      <div className="cell-sub">{client?.agent}</div>
                    </td>
                    <td>
                      <div className="cell-main" style={{ fontWeight: 500 }}>
                        {fmtDate(job.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="cell-sub">{shortTime(job.time)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {job.services.map((id) => (
                          <span key={id} className="chip" style={{ fontSize: 11, padding: '2px 6px' }}>
                            {serviceById(state.services, id)?.short}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {job.staff.length === 0 ? (
                        <span className="chip amber" style={{ fontSize: 11 }}>Unassigned</span>
                      ) : (
                        <div className="person">
                          {job.staff.slice(0, 2).map((id, i) => {
                            const person = state.staff.find((s) => s.id === id)
                            return person ? <Avatar key={id} name={person.name} initials={person.initials} tone={i + 1} /> : null
                          })}
                          <span className="small" style={{ color: 'var(--muted)' }}>
                            {job.staff.map((id) => state.staff.find((s) => s.id === id)?.name.split(' ')[0]).join(', ')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="num">
                      <span className="cell-mono">{money(value)}</span>
                      <div className="cell-sub">ex GST</div>
                    </td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <EmptyState icon={<Search size={18} />} title="No jobs match this filter">
              Try another status or clear the search.
            </EmptyState>
          )}
        </div>
      </div>

      {selected && <JobDrawer job={selected} onClose={closeJob} />}
    </>
  )
}

function nextLabel(status: JobStatus): string {
  switch (status) {
    case 'Booked':
      return 'Allocate team'
    case 'Allocated':
      return 'Mark as shot'
    case 'Shot':
      return 'Deliver & create invoice'
    case 'Delivered':
      return 'Send invoice'
    case 'Invoiced':
      return 'Mark invoice paid'
    default:
      return 'Job complete'
  }
}

function JobDrawer({ job, onClose }: { job: Job; onClose: () => void }) {
  const { state, advance, nextStatus, clientOf, staffOf } = useStore()
  const navigate = useNavigate()
  const [allocating, setAllocating] = useState(false)
  const [pickingTeam, setPickingTeam] = useState(false)

  const client = clientOf(job.clientId)
  const next = nextStatus(job)
  const index = STATUS_ORDER.indexOf(job.status)
  const invoice = state.invoices.find((i) => i.jobId === job.id)
  const subtotal = jobSubtotal(job, state.services)
  const gst = round2((subtotal * state.settings.gstPct) / 100)
  const commission = commissionOnSubtotal(job.clientId, subtotal, state.clients)

  return (
    <>
      <Drawer
        onClose={onClose}
        title={
          <>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{job.ref}</span>
            <StatusPill status={job.status} />
          </>
        }
        subtitle={
          <>
            {job.address}, {job.suburb} · {fmtDate(job.date, { weekday: 'long', day: 'numeric', month: 'short' })} at{' '}
            {job.time} · {client?.name}
          </>
        }
        footer={
          <>
            {invoice && (
              <button className="btn" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                <FileText size={15} /> {invoice.number}
              </button>
            )}
            <div style={{ flex: 1 }} />
            {job.status !== 'Booked' && (
              <button className="btn" onClick={() => setPickingTeam(true)}>
                <UserPlus size={15} /> Crew
              </button>
            )}
            {job.status === 'Booked' && (
              <button className="btn btn-primary" onClick={() => setAllocating(true)}>
                <Wand2 size={15} /> Smart Allocate
              </button>
            )}
            {next && job.status !== 'Booked' && (
              <button className="btn btn-primary" onClick={() => advance(job.id)}>
                {nextLabel(job.status)} <ArrowRight size={15} />
              </button>
            )}
          </>
        }
      >
        <div>
          <div className="field-label" style={{ marginBottom: 9 }}>Progress</div>
          <div className="step-grid">
            {STATUS_ORDER.map((step, i) => (
              <div key={step} className={`step-cell ${i < index ? 'done' : i === index ? 'current' : ''}`}>
                <span className="step-dot">{i < index ? <Check size={10} /> : i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {job.status === 'Booked' && (
          <div className="settings-note">
            <Sparkles size={15} style={{ flex: '0 0 auto', marginTop: 1 }} />
            <span>
              No crew yet. <b>Smart Allocate</b> ranks the team on skill, availability, travel and current load, then
              explains its choice.
            </span>
          </div>
        )}

        <div className="card" style={{ boxShadow: 'none' }}>
          <div className="card-head" style={{ paddingBottom: 0 }}>
            <h2 style={{ fontSize: 13.5 }}>Services &amp; price</h2>
            <div className="card-tools tiny faint">Client price · ex GST</div>
          </div>
          <div className="card-body" style={{ paddingTop: 10 }}>
            {job.services.map((id) => {
              const service = serviceById(state.services, id)
              if (!service) return null
              return (
                <div key={id} className="kv">
                  <dt>{service.name}</dt>
                  <dd>{money(service.price)}</dd>
                </div>
              )
            })}
            <div className="kv">
              <dt>GST {pct(state.settings.gstPct)}</dt>
              <dd>{money(gst)}</dd>
            </div>
            <div className="kv total">
              <dt>Invoice total</dt>
              <dd>{money(subtotal + gst)}</dd>
            </div>
            <div className="kv" style={{ fontSize: 11.5, color: 'var(--faint)' }}>
              <dt>Team pay for this job</dt>
              <dd style={{ fontWeight: 500, color: 'var(--faint)' }}>{money(jobTeamPay(job, state.services))}</dd>
            </div>
            {client && client.commissionPct > 0 && (
              <div className="kv" style={{ fontSize: 11.5, color: 'var(--faint)' }}>
                <dt>
                  Commission to {client.agent} ({pct(client.commissionPct)})
                </dt>
                <dd style={{ fontWeight: 500, color: 'var(--faint)' }}>{money(commission)}</dd>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="spread" style={{ marginBottom: 9 }}>
            <div className="field-label">Crew</div>
            <button className="btn btn-xs" onClick={() => setPickingTeam(true)}>
              <UserPlus size={13} /> {job.staff.length === 0 ? 'Assign' : 'Change'}
            </button>
          </div>
          {job.staff.length === 0 ? (
            <div className="small muted">Nobody assigned yet.</div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {job.staff.map((id, i) => {
                const person = staffOf(id)
                if (!person) return null
                return (
                  <div key={id} className="person">
                    <Avatar name={person.name} initials={person.initials} tone={i + 1} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{person.name}</div>
                      <div className="tiny faint">
                        {person.role} · {person.remote ? 'Remote' : person.suburb}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {job.notes && (
          <div>
            <div className="field-label" style={{ marginBottom: 5 }}>Note</div>
            <div className="small muted">{job.notes}</div>
          </div>
        )}

        {invoice && (
          <div className="settings-note" style={{ background: '#f8fafb', borderColor: 'var(--line)', color: 'var(--muted)' }}>
            <FileText size={15} style={{ flex: '0 0 auto', marginTop: 1 }} />
            <span>
              {invoice.number} · {invoice.status === 'draft' ? 'Draft' : invoice.status === 'paid' ? 'Paid' : 'Sent'} ·{' '}
              {money(invoiceTotals(invoice, state.settings.gstPct).total)} inc GST
            </span>
          </div>
        )}
      </Drawer>

      {allocating && (
        <AllocateModal
          job={job}
          onClose={() => setAllocating(false)}
          onAssigned={() => setAllocating(false)}
        />
      )}
      {pickingTeam && <CrewModal job={job} onClose={() => setPickingTeam(false)} />}
    </>
  )
}

function CrewModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const { state, assignStaff } = useStore()
  const [selected, setSelected] = useState<string[]>(job.staff)

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <Modal
      title="Assign crew"
      subtitle={`${job.address}, ${job.suburb} · ${fmtDate(job.date, { weekday: 'short', day: 'numeric', month: 'short' })}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={selected.length === 0}
            onClick={() => {
              assignStaff(job.id, selected)
              onClose()
            }}
          >
            Save crew
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 8 }}>
        {state.staff.map((person, i) => (
          <label key={person.id} className={`score-row ${selected.includes(person.id) ? 'top' : ''}`} style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.includes(person.id)}
              onChange={() => toggle(person.id)}
              style={{ accentColor: '#0f766e', marginTop: 6 }}
            />
            <Avatar name={person.name} initials={person.initials} tone={i + 1} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 650, fontSize: 13.5 }}>{person.name}</div>
              <div className="tiny faint">
                {person.role} · {person.remote ? 'Remote' : person.suburb} · {person.skills.join(', ')}
              </div>
            </div>
            {person.unavailable.includes(job.date) && <span className="pill pill-overdue">Unavailable</span>}
          </label>
        ))}
      </div>
    </Modal>
  )
}

function AllocateModal({ job, onClose, onAssigned }: { job: Job; onClose: () => void; onAssigned: () => void }) {
  const { state, assignStaff, staffOf } = useStore()
  const scores = useMemo(
    () => scoreStaff(job, state.staff, state.jobs, state.services),
    [job, state.staff, state.jobs, state.services],
  )
  const required = requiredSkills(job, state.services)
  const topPick = scores.find((s) => s.available && s.missing.length === 0) ?? scores.find((s) => s.available)
  const [selected, setSelected] = useState<string[]>(topPick ? [topPick.staff.id] : [])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const covered = new Set(selected.flatMap((id) => staffOf(id)?.skills ?? []))
  const missing = required.filter((skill) => !covered.has(skill))

  return (
    <Modal
      wide
      title="Smart Allocate"
      subtitle={`${job.ref} · ${job.address}, ${job.suburb} · ${fmtDate(job.date, { weekday: 'long', day: 'numeric', month: 'short' })}`}
      onClose={onClose}
      footer={
        <>
          <div className="small" style={{ marginRight: 'auto', alignSelf: 'center' }}>
            {missing.length === 0 ? (
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                <Check size={13} style={{ verticalAlign: -2 }} /> All {required.length} required skills covered
              </span>
            ) : (
              <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                Crew still needs: {missing.join(', ')}
              </span>
            )}
          </div>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={selected.length === 0}
            onClick={() => {
              assignStaff(job.id, selected)
              onAssigned()
            }}
          >
            Assign {selected.length > 1 ? `${selected.length} people` : 'team'}
          </button>
        </>
      }
    >
      <div className="chip accent" style={{ marginBottom: 12, fontSize: 11.5 }}>
        <Sparkles size={13} /> skill +50 · availability +30 · travel −2/km · weekly load −5/job · missing skill −100
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {scores.map((score, i) => {
          const recommended = topPick?.staff.id === score.staff.id
          return (
            <div key={score.staff.id} className={`score-row ${recommended ? 'top' : ''}`}>
              <input
                type="checkbox"
                checked={selected.includes(score.staff.id)}
                onChange={() => toggle(score.staff.id)}
                style={{ accentColor: '#0f766e', marginTop: 6 }}
                aria-label={`Select ${score.staff.name}`}
              />
              <Avatar name={score.staff.name} initials={score.staff.initials} tone={i + 1} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="spread" style={{ gap: 8 }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 650, fontSize: 13.5 }}>{score.staff.name}</span>
                    {recommended && <span className="chip accent" style={{ fontSize: 10, padding: '1px 6px' }}>Best match</span>}
                    {!score.available && <span className="pill pill-overdue">Unavailable</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="score-total">
                      {score.score}
                      <span>score</span>
                    </div>
                  </div>
                </div>
                <div className="tiny faint" style={{ marginTop: 2 }}>
                  {score.staff.role} · {score.staff.remote ? 'Remote' : score.staff.suburb}
                </div>
                <div className="score-breakdown">
                  <span className="score-chip pos">
                    {score.skill > 0 ? `+${score.skill}` : '0'} skill · {score.coverage}/{score.requiredCount}
                  </span>
                  <span className={`score-chip ${score.available ? 'pos' : 'neg'}`}>
                    {score.available ? '+30 free' : '+0 unavailable'}
                  </span>
                  <span className="score-chip neg">−{Math.abs(score.distanceScore)} travel · {score.distanceKm} km</span>
                  <span className="score-chip neg">−{Math.abs(score.loadScore)} load · {score.load} jobs</span>
                  {score.missing.length > 0 && (
                    <span className="score-chip neg">−{Math.abs(score.missingPenalty)} missing {score.missing.join(', ')}</span>
                  )}
                </div>
                <div className="tiny muted" style={{ marginTop: 6 }}>{score.reason}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
