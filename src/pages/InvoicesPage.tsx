import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BellRing, CheckCircle2, FileText, Printer, Search, Send } from 'lucide-react'
import { useStore } from '../store'
import { EmptyState, InvoicePill, Modal } from '../components/ui'
import { daysOverdue, invoiceTotals } from '../lib/calc'
import { daysBetween, fmtDate, todayISO } from '../lib/dates'
import { money } from '../lib/format'
import type { Invoice } from '../types'

type Filter = 'all' | 'draft' | 'sent' | 'overdue' | 'paid'

export function InvoicesPage() {
  const { state, clientOf } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const today = todayISO()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.invoices]
      .sort((a, b) => (a.issued < b.issued ? 1 : -1))
      .filter((inv) => {
        if (filter === 'draft') return inv.status === 'draft'
        if (filter === 'paid') return inv.status === 'paid'
        if (filter === 'sent') return inv.status === 'sent'
        if (filter === 'overdue') return daysOverdue(inv, today) > 0
        return true
      })
      .filter((inv) => {
        if (!q) return true
        const client = state.clients.find((c) => c.id === inv.clientId)
        const job = state.jobs.find((j) => j.id === inv.jobId)
        return [inv.number, client?.name, job?.address, job?.ref].filter(Boolean).join(' ').toLowerCase().includes(q)
      })
  }, [state.invoices, state.clients, state.jobs, filter, query, today])

  const totals = useMemo(() => {
    return state.invoices.reduce(
      (acc, inv) => {
        const t = invoiceTotals(inv, state.settings.gstPct)
        if (inv.status === 'paid') acc.paid += t.total
        else if (inv.status === 'sent') acc.open += t.total
        else acc.draft += t.total
        return acc
      },
      { paid: 0, open: 0, draft: 0 },
    )
  }, [state.invoices, state.settings.gstPct])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Invoices</h1>
          <p>GST invoices built from delivered jobs. Track what is sent, overdue and paid.</p>
        </div>
        <div className="page-actions">
          <span className="chip blue">Open {money(totals.open)}</span>
          <span className="chip amber">Draft {money(totals.draft)}</span>
          <span className="chip accent">Paid {money(totals.paid)}</span>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input
              className="input"
              placeholder="Search invoice, client or job"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {(['all', 'draft', 'sent', 'overdue', 'paid'] as Filter[]).map((f) => (
              <button key={f} className={`filter-pill ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Job</th>
                <th>Issued</th>
                <th>Due</th>
                <th className="num">Total inc GST</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((invoice) => {
                const client = clientOf(invoice.clientId)
                const job = state.jobs.find((j) => j.id === invoice.jobId)
                const total = invoiceTotals(invoice, state.settings.gstPct).total
                return (
                  <tr key={invoice.id} className="clickable" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <td>
                      <span className="cell-mono">{invoice.number}</span>
                    </td>
                    <td>
                      <div>{client?.name}</div>
                      <div className="cell-sub">{client?.agent}</div>
                    </td>
                    <td>
                      {job ? (
                        <>
                          <div>{job.address}</div>
                          <div className="cell-sub">{job.ref}</div>
                        </>
                      ) : (
                        <span className="faint">Historical</span>
                      )}
                    </td>
                    <td>{fmtDate(invoice.issued, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div>{fmtDate(invoice.due, { day: 'numeric', month: 'short' })}</div>
                      {daysOverdue(invoice, today) > 0 && (
                        <div className="cell-sub" style={{ color: 'var(--red)' }}>
                          {daysOverdue(invoice, today)} days late
                        </div>
                      )}
                    </td>
                    <td className="num cell-mono">{money(total)}</td>
                    <td>
                      <InvoicePill invoice={invoice} today={today} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <EmptyState icon={<FileText size={18} />} title="No invoices in this view">
              Deliver a job to create a draft invoice.
            </EmptyState>
          )}
        </div>
      </div>
    </>
  )
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const { state, markInvoicePaid, sendInvoice, notify, clientOf } = useStore()
  const navigate = useNavigate()
  const [confirmPay, setConfirmPay] = useState(false)
  const invoice = state.invoices.find((i) => i.id === invoiceId)
  const today = todayISO()

  if (!invoice) {
    return (
      <div className="card">
        <EmptyState icon={<FileText size={18} />} title="Invoice not found">
          <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => navigate('/invoices')}>
            Back to invoices
          </button>
        </EmptyState>
      </div>
    )
  }

  const client = clientOf(invoice.clientId)
  const job = state.jobs.find((j) => j.id === invoice.jobId)
  const totals = invoiceTotals(invoice, state.settings.gstPct)
  const late = daysOverdue(invoice, today)

  return (
    <>
      <div className="page-head no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ paddingLeft: 0, marginBottom: 4 }}>
            <ArrowLeft size={14} /> All invoices
          </button>
          <h1>{invoice.number}</h1>
          <p>
            {client?.name} · issued {fmtDate(invoice.issued, { day: 'numeric', month: 'short', year: 'numeric' })}
            {late > 0 ? ` · ${late} days overdue` : ''}
          </p>
        </div>
        <div className="page-actions">
          {invoice.status === 'draft' && (
            <button className="btn btn-primary" onClick={() => sendInvoice(invoice.id)}>
              <Send size={15} /> Send invoice
            </button>
          )}
          {invoice.status === 'sent' && (
            <>
              <button
                className="btn"
                onClick={() =>
                  notify('Reminder queued', `A follow-up to ${client?.name} is scheduled. The demo does not send email.`, 'info')
                }
              >
                <BellRing size={15} /> Send reminder
              </button>
              <button className="btn btn-primary" onClick={() => setConfirmPay(true)}>
                <CheckCircle2 size={15} /> Mark paid
              </button>
            </>
          )}
          {invoice.status === 'paid' && (
            <span className="chip accent">
              <CheckCircle2 size={14} /> Paid {invoice.paidDate ? fmtDate(invoice.paidDate) : ''}
            </span>
          )}
          <button className="btn" onClick={() => window.print()}>
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      <div className="invoice-wrap">
        <div>
          <InvoiceSheet invoice={invoice} />
          <div className="pdf-note no-print">Print preview gives a clean A4 tax invoice.</div>
        </div>

        <div className="stack no-print">
          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 8 }}>Invoice status</div>
            <div style={{ marginBottom: 12 }}>
              <InvoicePill invoice={invoice} today={today} />
            </div>
            <div className="kv">
              <dt>Subtotal</dt>
              <dd>{money(totals.subtotal)}</dd>
            </div>
            <div className="kv">
              <dt>GST {state.settings.gstPct}%</dt>
              <dd>{money(totals.gst)}</dd>
            </div>
            <div className="kv total">
              <dt>Total</dt>
              <dd>{money(totals.total)}</dd>
            </div>
            <div className="hint" style={{ marginTop: 10 }}>
              Terms {state.settings.paymentTermsDays} days · due {fmtDate(invoice.due, { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          {job && (
            <div className="card card-pad">
              <div className="field-label" style={{ marginBottom: 8 }}>Linked job</div>
              <div style={{ fontWeight: 600 }}>{job.address}</div>
              <div className="small muted">
                {job.suburb} · {job.ref} · {fmtDate(job.date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => navigate(`/jobs?job=${job.id}`)}>
                Open job
              </button>
            </div>
          )}

          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 8 }}>How it was built</div>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 16, lineHeight: 1.7 }}>
              <li>Line items come from the job services.</li>
              <li>GST is added from Settings ({state.settings.gstPct}%).</li>
              <li>Draft invoices follow rate changes. Sent and paid invoices stay fixed.</li>
              <li>Due date is issued date plus {state.settings.paymentTermsDays} days.</li>
            </ul>
          </div>
        </div>
      </div>

      {confirmPay && (
        <Modal
          title="Mark this invoice paid?"
          subtitle={`${invoice.number} · ${money(totals.total)} from ${client?.name}`}
          onClose={() => setConfirmPay(false)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmPay(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  markInvoicePaid(invoice.id)
                  setConfirmPay(false)
                  navigate('/invoices')
                }}
              >
                <CheckCircle2 size={15} /> Mark paid
              </button>
            </>
          }
        >
          <p className="small muted">
            The job moves to Paid, the outstanding total drops, and the agent commission becomes payable. In a live
            build this also posts the receipt to the accounts ledger.
          </p>
        </Modal>
      )}
    </>
  )
}

function InvoiceSheet({ invoice }: { invoice: Invoice }) {
  const { state, clientOf } = useStore()
  const client = clientOf(invoice.clientId)
  const job = state.jobs.find((j) => j.id === invoice.jobId)
  const totals = invoiceTotals(invoice, state.settings.gstPct)
  const overdue = daysOverdue(invoice)

  return (
    <div className="invoice-sheet">
      <div className="inv-top">
        <div>
          <div className="inv-brand">
            {state.company.name}
            <small>{state.company.address}</small>
          </div>
          <div className="tiny" style={{ color: '#6b7683', marginTop: 8, lineHeight: 1.6 }}>
            ABN {state.company.abn}
            <br />
            {state.company.email} · {state.company.phone}
          </div>
        </div>
        <div className="inv-title">
          <h1>Tax Invoice</h1>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{invoice.number}</div>
          <div className="tiny" style={{ color: '#6b7683' }}>
            {invoice.status === 'paid' ? 'PAID' : invoice.status === 'draft' ? 'DRAFT' : overdue > 0 ? 'OVERDUE' : 'SENT'}
          </div>
        </div>
      </div>

      <div className="inv-meta">
        <div>
          <div className="label">Bill to</div>
          <div style={{ fontWeight: 650 }}>{client?.name}</div>
          <div>
            Attn: {client?.agent}
            <br />
            {client?.suburb} VIC
            <br />
            {client?.email}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Invoice details</div>
          <div>
            Issued: <b>{fmtDate(invoice.issued, { day: 'numeric', month: 'short', year: 'numeric' })}</b>
          </div>
          <div>
            Due: <b>{fmtDate(invoice.due, { day: 'numeric', month: 'short', year: 'numeric' })}</b>
          </div>
          <div>Terms: {state.settings.paymentTermsDays} days</div>
          {job && <div>Job: {job.ref}</div>}
        </div>
      </div>

      {job && (
        <div style={{ fontSize: 12.5, marginBottom: 14, color: '#46525f' }}>
          <span className="label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#8a94a1', fontWeight: 650 }}>
            Property
          </span>
          <div style={{ fontWeight: 600, color: '#1b2530' }}>
            {job.address}, {job.suburb} VIC
          </div>
        </div>
      )}

      <table className="inv-table">
        <thead>
          <tr>
            <th style={{ width: '55%' }}>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => (
            <tr key={i}>
              <td>{line.description}</td>
              <td className="num">{line.qty}</td>
              <td className="num">{money(line.unitPrice)}</td>
              <td className="num">{money(line.qty * line.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-totals">
        <div className="row">
          <span>Subtotal (ex GST)</span>
          <span>{money(totals.subtotal)}</span>
        </div>
        <div className="row">
          <span>GST {state.settings.gstPct}%</span>
          <span>{money(totals.gst)}</span>
        </div>
        <div className="row grand">
          <span>Total AUD</span>
          <span>{money(totals.total)}</span>
        </div>
      </div>

      <div className="inv-foot">
        <strong>Payment</strong>
        <br />
        Bank transfer to Southeast Media Co. · BSB 083 004 · Account 41 928 7763 · Reference {invoice.number}
        <br />
        Please pay by {fmtDate(invoice.due, { day: 'numeric', month: 'long', year: 'numeric' })}. GST is included where
        shown. Thank you for your business.
        {invoice.status === 'paid' && invoice.paidDate && (
          <div style={{ marginTop: 8, color: '#15803d', fontWeight: 600 }}>
            Paid in full on {fmtDate(invoice.paidDate, { day: 'numeric', month: 'long', year: 'numeric' })}.
          </div>
        )}
        {invoice.status === 'sent' && daysBetween(invoice.issued, todayISO()) >= 0 && overdue === 0 && (
          <div style={{ marginTop: 8 }}>Please reference the invoice number with your payment.</div>
        )}
      </div>
    </div>
  )
}
