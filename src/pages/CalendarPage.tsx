import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '../store'
import { Modal, shortTime } from '../components/ui'
import { addDays, endOfWeek, fmtWeek, startOfWeek, todayISO, weekdayShort } from '../lib/dates'
import { money, round2 } from '../lib/format'
import { SUBURBS, serviceById } from '../lib/calc'

const START_HOUR = 7
const HOURS = 12
const ROW = 56

export function CalendarPage() {
  const { state, addJob, notify } = useStore()
  const navigate = useNavigate()
  const today = todayISO()
  const [anchor, setAnchor] = useState(startOfWeek(today))
  const [showBooking, setShowBooking] = useState(false)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor])
  const weekJobs = state.jobs.filter((j) => j.date >= anchor && j.date <= endOfWeek(anchor))

  const openWeek = (date: string) => setAnchor(startOfWeek(date))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>Week of {fmtWeek(anchor)} · {weekJobs.length} jobs booked</p>
        </div>
        <div className="page-actions">
          <button
            className="btn"
            onClick={() => notify('Google Calendar sync', 'Calendar import connects here in the full build. The demo runs offline.', 'info')}
          >
            <CalendarPlus size={15} /> Import Google Calendar
            <span className="chip" style={{ padding: '1px 5px', fontSize: 9.5, marginLeft: 2 }}>SOON</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowBooking(true)}>
            <Plus size={15} /> New booking
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="segmented">
            <button onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week">
              <ChevronLeft size={14} />
            </button>
            <button className="on" onClick={() => setAnchor(startOfWeek(today))}>
              This week
            </button>
            <button onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Next week">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="legend-row">
            <span className="legend-chip"><span style={{ background: '#d7dde5' }} />Booked</span>
            <span className="legend-chip"><span style={{ background: '#b9cdf8' }} />Allocated</span>
            <span className="legend-chip"><span style={{ background: '#f6d998' }} />Shot</span>
            <span className="legend-chip"><span style={{ background: '#d8c7f8' }} />Delivered</span>
            <span className="legend-chip"><span style={{ background: '#b7e6dc' }} />Invoiced</span>
            <span className="legend-chip"><span style={{ background: '#bfe8cd' }} />Paid</span>
          </div>
        </div>

        <div className="week-scroll">
          <div className="week-grid">
            <div className="week-col-head" style={{ borderLeft: 0 }} />
            {days.map((day) => (
              <div key={day} className={`week-col-head ${day === today ? 'today' : ''}`}>
                <div className="dow">{weekdayShort(day)}</div>
                <div className="dom">{Number(day.slice(8))}</div>
              </div>
            ))}

            <div className="week-time-col">
              {Array.from({ length: HOURS }, (_, i) => (
                <div key={i} className="week-hour-label">
                  {String(START_HOUR + i).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {days.map((day) => (
              <div key={day} className="week-col">
                {weekJobs
                  .filter((j) => j.date === day)
                  .map((job) => {
                    const [h, m] = job.time.split(':').map(Number)
                    const top = Math.max(0, (h + m / 60 - START_HOUR) * ROW)
                    const hours = Math.max(
                      1,
                      job.services.reduce((sum, id) => sum + (serviceById(state.services, id)?.hours ?? 1), 0),
                    )
                    const height = Math.max(34, Math.min(hours * ROW - 4, HOURS * ROW - top - 2))
                    return (
                      <button
                        key={job.id}
                        className={`week-slot ws-${job.status.toLowerCase()}`}
                        style={{ top, height }}
                        onClick={() => navigate(`/jobs?job=${job.id}`)}
                        title={`${job.ref} · ${job.address}, ${job.suburb} · ${state.clients.find((c) => c.id === job.clientId)?.name ?? ''}`}
                      >
                        <div className="ws-time">{shortTime(job.time)}</div>
                        <div className="ws-title">{job.address}</div>
                        <div className="ws-title" style={{ fontWeight: 500, opacity: 0.85 }}>
                          {state.clients.find((c) => c.id === job.clientId)?.name.replace(' Real Estate', '')}
                        </div>
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showBooking && (
        <NewBookingModal
          defaultDate={today >= anchor && today <= endOfWeek(anchor) ? today : anchor}
          onClose={() => setShowBooking(false)}
          onCreate={(input) => {
            addJob(input)
            openWeek(input.date)
            setShowBooking(false)
          }}
        />
      )}
    </>
  )
}

function NewBookingModal({
  defaultDate,
  onClose,
  onCreate,
}: {
  defaultDate: string
  onClose: () => void
  onCreate: (input: {
    clientId: string
    address: string
    suburb: string
    date: string
    time: string
    services: string[]
    notes?: string
  }) => void
}) {
  const { state } = useStore()
  const [clientId, setClientId] = useState(state.clients[0].id)
  const [address, setAddress] = useState('')
  const [suburb, setSuburb] = useState(state.clients[0].suburb)
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('09:00')
  const [services, setServices] = useState<string[]>(['svc-photos'])
  const [notes, setNotes] = useState('')

  const chosen = state.services.filter((s) => services.includes(s.id))
  const subtotal = chosen.reduce((sum, s) => sum + s.price, 0)
  const gst = round2((subtotal * state.settings.gstPct) / 100)

  const toggle = (id: string) =>
    setServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const valid = address.trim().length > 2 && services.length > 0

  return (
    <Modal
      title="New booking"
      subtitle="The job starts as Booked. Allocate the team from the Jobs page."
      onClose={onClose}
      wide
      footer={
        <>
          <div className="hint" style={{ marginRight: 'auto', alignSelf: 'center' }}>
            {services.length} service{services.length === 1 ? '' : 's'} · {money(subtotal + gst)} inc GST
          </div>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!valid}
            onClick={() =>
              onCreate({
                clientId,
                address: address.trim(),
                suburb,
                date,
                time,
                services,
                notes: notes.trim() || undefined,
              })
            }
          >
            Create booking
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="bk-client">Client</label>
          <select
            id="bk-client"
            className="select"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              const client = state.clients.find((c) => c.id === e.target.value)
              if (client) setSuburb(client.suburb)
            }}
          >
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bk-suburb">Suburb</label>
          <select id="bk-suburb" className="select" value={suburb} onChange={(e) => setSuburb(e.target.value)}>
            {SUBURBS.filter((s) => s !== 'Remote').map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field span-2">
          <label htmlFor="bk-address">Property address</label>
          <input
            id="bk-address"
            className="input"
            placeholder="e.g. 21 Paperbark Rise"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="bk-date">Date</label>
          <input id="bk-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bk-time">Start time</label>
          <select id="bk-time" className="select" value={time} onChange={(e) => setTime(e.target.value)}>
            {Array.from({ length: 22 }, (_, i) => {
              const minutes = 7 * 60 + i * 30
              const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
              return (
                <option key={value} value={value}>
                  {shortTime(value)}
                </option>
              )
            })}
          </select>
        </div>
        <div className="field span-2">
          <span className="field-label">Services</span>
          <div className="check-grid">
            {state.services.map((service) => (
              <label key={service.id} className={`check ${services.includes(service.id) ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={services.includes(service.id)}
                  onChange={() => toggle(service.id)}
                />
                {service.short}
                <span className="check-price">{money(service.price)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field span-2">
          <label htmlFor="bk-notes">Note for the team (optional)</label>
          <input
            id="bk-notes"
            className="input"
            placeholder="Gate code, contact name, access notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="settings-note" style={{ marginTop: 16 }}>
        <span>
          <b>GST {state.settings.gstPct}%</b> is added on the invoice · {money(subtotal)} + {money(gst)} ={' '}
          <b>{money(subtotal + gst)}</b>
        </span>
      </div>
    </Modal>
  )
}
