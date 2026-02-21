export function formatPrice(price: number): string {
  const cents = Math.round(price * 100);
  return `${cents}¢`;
}

export function formatSize(size: number): string {
  return Math.round(size).toLocaleString("en-US");
}

export function formatCurrency(dollars: number): string {
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBps(bps: number): string {
  const sign = bps >= 0 ? "+" : "";
  return `${sign}${bps.toFixed(1)} bps`;
}
