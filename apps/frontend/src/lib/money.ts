// The API keeps money as whole kobo (₦1 = 100 kobo); people see naira
const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatNaira(kobo: number): string {
  return naira.format(kobo / 100);
}

export function nairaToKobo(value: string): number | undefined {
  const amount = Number(value.replace(/[,\s₦]/g, ''));
  return value.trim() && Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
}
