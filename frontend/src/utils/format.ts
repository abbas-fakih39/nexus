const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

/** Formate un montant (string Decimal ou number) en euros : 12.9 → "12,90 €". */
export function formatEuro(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) ? '—' : euro.format(n);
}

const dateTime = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Formate une date ISO en "07/06/2026 14:32". */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '—' : dateTime.format(d);
}

const dateOnly = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Formate une date ISO en "07/06/2026". */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '—' : dateOnly.format(d);
}
