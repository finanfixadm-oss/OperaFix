import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const companiesRouter = Router();

companiesRouter.get("/", async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { created_at: "desc" }
    });
    res.json(companies);
  } catch (error) {
    next(error);
  }
});

companiesRouter.post("/", async (req, res, next) => {
  try {
    const company = await prisma.company.create({
      data: {
        rut: req.body.rut,
        business_name: req.body.business_name,
        mandante: req.body.mandante,
        address: req.body.address,
        email: req.body.email,
        estimated_amount: req.body.estimated_amount
      }
    });
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
});
