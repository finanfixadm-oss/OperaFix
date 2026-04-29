export function parseMoney(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const clean = String(value)
    .replace(/\$/g, "")
    .replace(/CLP/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const num = Number(clean);
  return Number.isFinite(num) ? num : 0;
}
