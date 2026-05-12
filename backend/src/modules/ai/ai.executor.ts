import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type AIAction = "getRecords" | "updateRecords" | "assignOwner";

type AIRequest = {
  action: AIAction;
  filters?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export const executeAI = async (req: AIRequest) => {
  switch (req.action) {
    case "getRecords":
      return prisma.lmRecord.findMany({
        where: req.filters || {},
        take: 100,
      });

    case "updateRecords":
      return prisma.lmRecord.updateMany({
        where: req.filters || {},
        data: req.data || {},
      });

    case "assignOwner":
      return prisma.lmRecord.updateMany({
        where: req.filters || {},
        data: req.data || {},
      });

    default:
      throw new Error("Acción no soportada");
  }
};