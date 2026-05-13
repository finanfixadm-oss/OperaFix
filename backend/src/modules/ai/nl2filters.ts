type PrismaFilter = Record<string, unknown>;

const parseMoney = (value: string): number => {
  return Number(value.replace(/\./g, "").replace(/\$/g, "").trim());
};

const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const AFP_MAP: Record<string, string> = {
  modelo: "modelo",
  capital: "capital",
  habitat: "habitat",
  provida: "provida",
  cuprum: "cuprum",
  uno: "uno",
  planvital: "planvital",
  "plan vital": "planvital",
};

const MANDANTE_MAP: Record<string, string> = {
  "mundo previsional": "mundo previsional",
  mundo: "mundo previsional",
  optimiza: "optimiza",
  "optimiza consulting": "optimiza",
  finanfix: "finanfix",
};

const STATUS_MAP: Record<string, string> = {
  pendiente: "pendiente",
  pendientes: "pendiente",
  pagado: "pagado",
  pagados: "pagado",
  rechazada: "rechaz",
  rechazado: "rechaz",
  rechazo: "rechaz",
  gestionado: "gestionado",
  gestionados: "gestionado",
};

const containsInsensitive = (value: string): PrismaFilter => ({
  contains: value,
  mode: "insensitive",
});

export const nlToFilters = (text: string): PrismaFilter => {
  const t = normalize(text);
  const where: PrismaFilter = {};
  const andFilters: PrismaFilter[] = [];

  const montoMatch = t.match(/(?:sobre|mayor a|mayores a|desde|>=|>\s*)(\$?\s*[\d\.]+)/);

  if (montoMatch) {
    andFilters.push({
      refund_amount: {
        gt: parseMoney(montoMatch[1]),
      },
    });
  }

  Object.entries(STATUS_MAP).forEach(([key, value]) => {
    if (t.includes(key)) {
      andFilters.push({
        management_status: containsInsensitive(value),
      });
    }
  });

  Object.entries(AFP_MAP).forEach(([key, value]) => {
    if (t.includes(key)) {
      andFilters.push({
        entity: containsInsensitive(value),
      });
    }
  });

  Object.entries(MANDANTE_MAP).forEach(([key, value]) => {
    if (t.includes(key)) {
      andFilters.push({
        mandante: containsInsensitive(value),
      });
    }
  });

  if (t.includes("con cc") || t.includes("cuenta corriente en si") || t.includes("cc en si")) {
    andFilters.push({ confirmation_cc: true });
  }

  if (t.includes("con poder") || t.includes("poder en si")) {
    andFilters.push({ confirmation_power: true });
  }

  if (t.includes("sin cc") || t.includes("sin cuenta corriente")) {
    andFilters.push({ confirmation_cc: false });
  }

  if (t.includes("sin poder")) {
    andFilters.push({ confirmation_power: false });
  }

  if (t.includes("con monto") || t.includes("tenga monto")) {
    andFilters.push({ refund_amount: { gt: 0 } });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
};
