type PrismaFilter = Record<string, unknown>;

const parseMoney = (value: string): number => {
  return Number(value.replace(/\./g, "").replace(/\$/g, "").trim());
};

export const nlToFilters = (text: string): PrismaFilter => {
  const t = text.toLowerCase();
  const where: PrismaFilter = {};
  const andFilters: PrismaFilter[] = [];

  const montoMatch = t.match(/(sobre|mayor a|>\s*)(\$?\s*[\d\.]+)/);

  if (montoMatch) {
    andFilters.push({
      refund_amount: {
        gt: parseMoney(montoMatch[2]),
      },
    });
  }

  if (t.includes("pendiente")) {
    andFilters.push({
      management_status: {
        contains: "pendiente",
        mode: "insensitive",
      },
    });
  }

  if (t.includes("pagado")) {
    andFilters.push({
      management_status: {
        contains: "pagado",
        mode: "insensitive",
      },
    });
  }

  if (t.includes("modelo")) {
    andFilters.push({
      pension_fund: {
        contains: "modelo",
        mode: "insensitive",
      },
    });
  }

  if (t.includes("capital")) {
    andFilters.push({
      pension_fund: {
        contains: "capital",
        mode: "insensitive",
      },
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
};