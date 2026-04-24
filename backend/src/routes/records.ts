import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

// LISTA DE REGISTROS DE EMPRESAS
router.get("/", async (_req, res) => {
  try {
    const data = await prisma.management.findMany({
      include: {
        mandante: true,
        company: true,
        line: true,
        lineAfp: true,
        documents: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo registros" });
  }
});

// DETALLE DEL REGISTRO
router.get("/:id", async (req, res) => {
  try {
    const data = await prisma.management.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        mandante: true,
        company: true,
        line: true,
        lineAfp: true,
        documents: true,
        notes: true,
        activities: true,
      },
    });

    if (!data) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo registro" });
  }
});

export default router;