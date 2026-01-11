import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth/index.js";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage/index.js";
import { registerApiRoutes } from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json());

async function main() {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);
  registerApiRoutes(app);

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  if (isProduction) {
    const staticPath = path.resolve(__dirname, "..");
    app.use(express.static(staticPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  const server = createServer(app);
  const port = isProduction ? 5000 : 3001;
  const host = isProduction ? "0.0.0.0" : "127.0.0.1";
  
  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
  });
}

main().catch(console.error);
