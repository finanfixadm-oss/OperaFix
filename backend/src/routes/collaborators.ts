import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const collaboratorsRouter = Router();

collaboratorsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.collaborator.findMany({
      include: { company: true },
      orderBy: { created_at: "desc" }
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

collaboratorsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.collaborator.create({
      data: {
        company_id: req.body.company_id,
        full_name: req.body.full_name,
        position: req.body.position,
        email: req.body.email,
        phone: req.body.phone,
        linkedin_url: req.body.linkedin_url
      }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});
