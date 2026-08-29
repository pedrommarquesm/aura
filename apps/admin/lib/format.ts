const number = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

const dateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatNumber(value: number): string {
  return number.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dateTime.format(new Date(value));
}
