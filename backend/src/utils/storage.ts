import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

export function ensureUploadDir() {
  const absolute = path.resolve(process.cwd(), env.uploadDir);
  if (!fs.existsSync(absolute)) {
    fs.mkdirSync(absolute, { recursive: true });
  }
  return absolute;
}
