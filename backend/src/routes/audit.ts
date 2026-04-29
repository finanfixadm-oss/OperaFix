import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { ensureAuditTable } from "../middleware/security.js";

const auditRouter = Router();

auditRouter.get("/", async (req, res) => {
  try {
    await ensureAuditTable();
    const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 1000));
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `select id, user_email, user_role, mandante_name, action, module, record_id, detail, ip, user_agent, created_at
       from operafix_audit_logs
       order by created_at desc
       limit $1`,
      limit
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "No se pudo cargar la auditoría.", detail: error?.message });
  }
});

export default auditRouter;
