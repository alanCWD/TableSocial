import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerApiRoutes } from "./routes";

const app = express();

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

  const server = createServer(app);
  const port = 3001;
  
  server.listen(port, "127.0.0.1", () => {
    console.log(`Server running on http://127.0.0.1:${port}`);
  });
}

main().catch(console.error);
