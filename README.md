# ShootBooks

A small working demo of an accounting and job management system for a media
production business. It follows each job from booking to invoice to payslip,
with the rates, GST and commission calculated for you.

Sample data only. There is no server, no login and no API key. The browser
saves changes in `localStorage`, and **Reset demo data** puts the sample back.

## What it shows

- **Dashboard**: revenue, outstanding and overdue invoices, team pay owed,
  commissions owed, net profit, a six-week revenue and expense chart, and a
  "needs attention" list.
- **Calendar**: week view with colour-coded jobs, plus a New booking form.
- **Jobs**: filterable list, job drawer with a status stepper, and
  **Smart Allocate**. Smart Allocate scores each person on skill, availability,
  travel distance and current weekly load, and shows the score breakdown.
- **Invoices**: draft, sent, overdue and paid invoices, with a printable A4 tax
  invoice, GST, payment terms and a Mark paid action.
- **Team & Pay**: weekly payslips per person, weekend loading, super, editor
  hours, agent commissions and a pay run approval.
- **Employee portal**: switch the **View as** menu to a team member. Only that
  person's jobs and payslips appear, and the admin pages are hidden.
- **Settings**: edit service prices, team pay, GST, super, payment terms and
  commission rates. Draft invoices and pending pay lines recalculate.

## Try the main flow

1. Open **Calendar**, then **New booking**.
2. Open **Jobs**, select the new job, and run **Smart Allocate**.
3. Advance the job to **Delivered**. The draft invoice and the pay lines appear.
4. Open **Invoices**, send the invoice, then mark it paid.
5. Open **Team & Pay** to approve the pay run.
6. Switch **View as** to a team member to see their portal.

## Run locally

```bash
npm install
npm run dev
```

Build the static files:

```bash
npm run build
```

The output goes to `dist/`. On Cloudflare Pages, use build command
`npm run build` and output directory `dist`.

## Stack

React, TypeScript and Vite. Charts use Recharts. Routing uses hash routes, so
deep links work on static hosting without rewrite rules. No backend.
