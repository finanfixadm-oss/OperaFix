import express from "express";
import { markOpened, getMailLogs } from "../modules/mail/mail.v2.js";

const router = express.Router();

router.get("/open/:id", (req, res) => {
  markOpened(Number(req.params.id));

  res.setHeader("Content-Type", "image/gif");
  res.send(Buffer.from("R0lGODlhAQABAAAAACw=", "base64"));
});

router.get("/logs", (_req, res) => {
  res.json(getMailLogs());
});

export default router;