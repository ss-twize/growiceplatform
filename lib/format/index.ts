const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0
});

export function formatRub(value: number | null | undefined): string {
  return rubFormatter.format(Number(value ?? 0));
}

export function formatInt(value: number | null | undefined): string {
  return numberFormatter.format(Number(value ?? 0));
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  return `${Number(value ?? 0).toFixed(digits)}%`;
}

export function formatDate(input: string | Date): string {
  const value = input instanceof Date ? input : new Date(input);
  return value.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDayMonth(input: string | Date): string {
  const value = input instanceof Date ? input : new Date(input);
  return value.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function formatDateTime(input: string | Date): string {
  const value = input instanceof Date ? input : new Date(input);
  return value.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}
