import { useState } from 'react'
import { Building2, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { money, pct, round2 } from '../lib/format'

export function SettingsPage() {
  const { state, updateService, updateClient, updateSettings, reset } = useStore()
  const [resetOpen, setResetOpen] = useState(false)
  const exampleSubtotal =
    (state.services.find((s) => s.id === 'svc-photos')?.price ?? 0) +
    (state.services.find((s) => s.id === 'svc-drone')?.price ?? 0) +
    (state.services.find((s) => s.id === 'svc-plan')?.price ?? 0)
  const exampleGst = round2((exampleSubtotal * state.settings.gstPct) / 100)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings &amp; rates</h1>
          <p>Prices, pay and percentages are data. Change them here and the demo recalculates.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setResetOpen(true)}>
            <RefreshCw size={15} /> Reset demo data
          </button>
        </div>
      </div>

      <div className="settings-note" style={{ marginBottom: 18 }}>
        <SlidersHorizontal size={16} style={{ flex: '0 0 auto', marginTop: 1 }} />
        <span>
          Draft invoices and pending pay lines recalculate as you type. Sent and paid invoices never change, so the
          accounts stay consistent.
        </span>
      </div>

      <div className="section-grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card rate-table">
          <div className="card-head">
            <div>
              <h2>Services</h2>
              <p>Client price and team pay, GST excluded</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th className="num">Client price</th>
                  <th className="num">Team pay</th>
                  <th className="num">Margin</th>
                </tr>
              </thead>
              <tbody>
                {state.services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div className="cell-main" style={{ fontSize: 12.5 }}>{service.short}</div>
                      <div className="cell-sub">{service.skill} · {service.hours} h</div>
                    </td>
                    <td className="num">
                      <input
                        className="input sm"
                        type="number"
                        min={0}
                        step={5}
                        value={service.price}
                        onChange={(e) => updateService(service.id, { price: Math.max(0, Number(e.target.value)) })}
                        aria-label={`${service.short} client price`}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="input sm"
                        type="number"
                        min={0}
                        step={5}
                        value={service.pay}
                        onChange={(e) => updateService(service.id, { pay: Math.max(0, Number(e.target.value)) })}
                        aria-label={`${service.short} team pay`}
                      />
                    </td>
                    <td className="num">
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                        {service.price > 0 ? pct(round2(((service.price - service.pay) / service.price) * 100)) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <div className="hint">
              Example: Photos + Drone + Floor Plan = {money(exampleSubtotal)} + GST {money(exampleGst)} ={' '}
              <b>{money(round2(exampleSubtotal + exampleGst))}</b>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Company &amp; tax</h2>
                <p>Used on every invoice</p>
              </div>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="set-gst">GST %</label>
                  <input
                    id="set-gst"
                    className="input"
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={state.settings.gstPct}
                    onChange={(e) => updateSettings({ gstPct: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="set-super">Super %</label>
                  <input
                    id="set-super"
                    className="input"
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={state.settings.superPct}
                    onChange={(e) => updateSettings({ superPct: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="set-terms">Payment terms (days)</label>
                  <input
                    id="set-terms"
                    className="input"
                    type="number"
                    min={0}
                    max={90}
                    value={state.settings.paymentTermsDays}
                    onChange={(e) => updateSettings({ paymentTermsDays: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <div className="person" style={{ marginBottom: 8 }}>
                  <div className="empty-icon" style={{ margin: 0, width: 32, height: 32 }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: 13 }}>{state.company.name}</div>
                    <div className="tiny faint">ABN {state.company.abn}</div>
                  </div>
                </div>
                <div className="small muted" style={{ lineHeight: 1.6 }}>
                  {state.company.address}
                  <br />
                  {state.company.email} · {state.company.phone}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>Agent commissions</h2>
                <p>Paid to the agent who refers the job</p>
              </div>
            </div>
            <div className="card-body">
              <div className="stack" style={{ gap: 9 }}>
                {state.clients.map((client) => (
                  <div key={client.id} className="spread">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{client.name}</div>
                      <div className="tiny faint">{client.agent}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        className="input sm"
                        style={{ width: 74, textAlign: 'right' }}
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={client.commissionPct}
                        onChange={(e) => updateClient(client.id, { commissionPct: Math.max(0, Number(e.target.value)) })}
                        aria-label={`${client.name} commission`}
                      />
                      <span className="small faint">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hint" style={{ marginTop: 12 }}>
                Commission is worked out on the GST-exclusive invoice total.
              </div>
            </div>
          </div>
        </div>
      </div>

      {resetOpen && (
        <Modal
          title="Reset demo data?"
          subtitle="This restores the original sample jobs, invoices and pay lines."
          onClose={() => setResetOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setResetOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  reset()
                  setResetOpen(false)
                }}
              >
                <RefreshCw size={15} /> Reset data
              </button>
            </>
          }
        >
          <p className="small muted">Rate changes and new bookings are lost. The demo goes back to the starting state.</p>
        </Modal>
      )}
    </>
  )
}
