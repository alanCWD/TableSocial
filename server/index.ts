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

  const server = createServer(app);
  const port = 3001;
  
  server.listen(port, "localhost", () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main().catch(console.error);
