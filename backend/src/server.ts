import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureUploadDir } from "./utils/storage.js";

ensureUploadDir();

app.listen(env.port, () => {
  console.log(`OperaFix API disponible en http://localhost:${env.port}`);
});
