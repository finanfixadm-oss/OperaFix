import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const lmGroupsRouter = Router();

lmGroupsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.lmCompanyGroup.findMany({
      orderBy: { created_at: "desc" }
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

lmGroupsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.lmCompanyGroup.create({
      data: {
        name: req.body.name,
        mandante: req.body.mandante,
        secondary_email: req.body.secondary_email,
        groups_related: req.body.groups_related
      }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});
