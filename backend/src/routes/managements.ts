import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

// GET
router.get("/", async (req, res) => {
  try {
    const { line_afp_id } = req.query;

    const data = await prisma.management.findMany({
      where: {
        line_afp_id: line_afp_id ? String(line_afp_id) : undefined,
      },
      include: {
        line_afp: true,
      },
      orderBy: { created_at: "desc" },
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno");
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const data = await prisma.management.create({
      data: {
        ...req.body,
      },
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creando gestión");
  }
});

export default router;