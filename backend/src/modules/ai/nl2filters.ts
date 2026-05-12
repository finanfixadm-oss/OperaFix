type Filters = Record<string, any>;

const money = (s: string) =>
  Number(s.replace(/\./g, "").replace(/\$/g, "").trim());

export const nlToFilters = (text: string): Filters => {
  const t = text.toLowerCase();

  const where: Filters = {};

  // monto (usa refund_amount que sí tienes)
  const montoMatch = t.match(/(sobre|mayor a|>\s*)(\$?\s*[\d\.]+)/);
  if (montoMatch) {
    where.refund_amount = { gt: money(montoMatch[2]) };
  }

  // estado (usa variantes posibles)
  if (t.includes("pendiente")) {
    where.OR = [
      { management_status: { contains: "pendiente", mode: "insensitive" } },
      { estado: { contains: "pendiente", mode: "insensitive" } },
    ];
  }

  // entidad (variantes)
  if (t.includes("modelo")) {
    where.OR = [
      ...(where.OR || []),
      { afp: { contains: "modelo", mode: "insensitive" } },
      { entidad: { contains: "modelo", mode: "insensitive" } },
      { institution: { contains: "modelo", mode: "insensitive" } },
    ];
  }

  if (t.includes("capital")) {
    where.OR = [
      ...(where.OR || []),
      { afp: { contains: "capital", mode: "insensitive" } },
      { entidad: { contains: "capital", mode: "insensitive" } },
      { institution: { contains: "capital", mode: "insensitive" } },
    ];
  }

  return where;
};