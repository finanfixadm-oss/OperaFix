import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const tpGroupsRouter = Router();

tpGroupsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.tpCompanyGroup.findMany({
      orderBy: { created_at: "desc" }
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

tpGroupsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.tpCompanyGroup.create({
      data: {
        name: req.body.name,
        mandante: req.body.mandante,
        email: req.body.email,
        groups_related: req.body.groups_related
      }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});
