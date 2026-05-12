export type AIParsedAction = {
  intent: "get" | "update";
  data: Record<string, unknown>;
};

const normalize = (text: string): string => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const nlToAction = (text: string): AIParsedAction => {
  const t = normalize(text);

  const data: Record<string, unknown> = {};

  if (
    t.includes("cambia") ||
    t.includes("cambiar") ||
    t.includes("marca") ||
    t.includes("marcar") ||
    t.includes("actualiza") ||
    t.includes("actualizar")
  ) {
    const statusMatch =
      text.match(/a\s+([A-Za-zÁÉÍÓÚáéíóúÑñ ]+)$/i) ||
      text.match(/como\s+([A-Za-zÁÉÍÓÚáéíóúÑñ ]+)$/i);

    if (statusMatch?.[1]) {
      data.management_status = statusMatch[1].trim();
    }

    return {
      intent: "update",
      data,
    };
  }

  if (
    t.includes("etiqueta") ||
    t.includes("tag") ||
    t.includes("prioridad")
  ) {
    const tagMatch =
      text.match(/como\s+([A-Za-z0-9_ -]+)$/i) ||
      text.match(/prioridad\s+([A-Za-z0-9_ -]+)$/i);

    data.tag_manual = tagMatch?.[1]?.trim() || "PRIORIDAD_IA";

    return {
      intent: "update",
      data,
    };
  }

  return {
    intent: "get",
    data,
  };
};