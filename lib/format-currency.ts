export function formatCurrency(value: number) {
  return `Rs ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}
