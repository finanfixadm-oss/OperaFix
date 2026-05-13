
import { Prisma } from "@prisma/client";

export function loadCRMFields() {
  const model = Prisma.dmmf.datamodel.models.find(
    (m) => m.name === "LmRecord"
  );

  if (!model) return [];

  return model.fields.map((f) => f.name);
}
