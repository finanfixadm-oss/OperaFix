import app from "./app.js";
import { env } from "./config/env.js";
import { ensureUploadDir } from "./utils/storage.js";
import aiV66 from "./modules/ai/ai.v66.routes.js";
import mailRoutes from "./routes/mail.js";
import { runCron } from "./jobs/cron.js";

ensureUploadDir();

app.use("/api/ai", aiV66);
app.use("/api/mail", mailRoutes);
setInterval(() => {
  runCron().catch(console.error);
}, 5 * 60 * 1000);
app.listen(env.port, () => {
  console.log(`OperaFix API disponible en http://localhost:${env.port}`);
});

