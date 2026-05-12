type PrismaFilter = Record<string, unknown>;

const parseMoney = (value: string): number => {
  return Number(value.replace(/\./g, "").replace(/\$/g, "").trim());
};

const AFP_MAP: Record<string, string> = {
  modelo: "modelo",
  capital: "capital",
  habitat: "habitat",
  provida: "provida",
  cuprum: "cuprum",
  uno: "uno",
  planvital: "planvital",
};

export const nlToFilters = (text: string): PrismaFilter => {
  const t = text.toLowerCase();
  const where: PrismaFilter = {};
  const andFilters: PrismaFilter[] = [];

  // 💰 MONTO
  const montoMatch = t.match(/(sobre|mayor a|>\s*)(\$?\s*[\d\.]+)/);

  if (montoMatch) {
    andFilters.push({
      refund_amount: {
        gt: parseMoney(montoMatch[2]),
      },
    });
  }

  // 📊 ESTADOS
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

  if (t.includes("rechazado")) {
    andFilters.push({
      management_status: {
        contains: "rechazado",
        mode: "insensitive",
      },
    });
  }

  // 🏦 AFP DINÁMICA
  let afpDetected = false;

  Object.entries(AFP_MAP).forEach(([key, value]) => {
    if (t.includes(key)) {
      afpDetected = true;

      andFilters.push({
        entity: {
          contains: value,
          mode: "insensitive",
        },
      });
    }
  });

  // 🔥 BONUS: si no detecta AFP, no filtra (trae todas)

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
};