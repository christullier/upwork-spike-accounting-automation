const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const aud0 = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function money(n: number): string {
  return aud.format(round2(n))
}

export function money0(n: number): string {
  return aud0.format(Math.round(n))
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function pct(n: number): string {
  return `${round2(n)}%`
}
