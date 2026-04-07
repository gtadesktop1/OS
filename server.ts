import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Node {
  id: string;
  role: "client" | "server" | "dns";
  location: string;
  lastSeen: number;
}

interface SharedApp {
  id: string;
  name: string;
  code: string;
  authorId: string;
  type: "app" | "addon";
}

// In-memory "Network" state
let nodes: Node[] = [];
let sharedApps: SharedApp[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- NETWORK API ---

  // Register a node
  app.post("/api/network/register", (req, res) => {
    const { id, role, location } = req.body;
    const existingIndex = nodes.findIndex(n => n.id === id);
    const newNode = { id, role, location, lastSeen: Date.now() };
    
    if (existingIndex > -1) {
      nodes[existingIndex] = newNode;
    } else {
      nodes.push(newNode);
    }
    
    // Cleanup old nodes (older than 1 minute)
    nodes = nodes.filter(n => Date.now() - n.lastSeen < 60000);
    
    res.json({ success: true, nodes });
  });

  // Get all nodes (DNS)
  app.get("/api/network/nodes", (req, res) => {
    res.json(nodes);
  });

  // --- SHARED FOLDER / PACKAGE MANAGER API ---

  // Upload an app to the shared folder
  app.post("/api/shared/upload", (req, res) => {
    const { name, code, authorId, type } = req.body;
    const id = Math.random().toString(36).substring(7);
    const newApp: SharedApp = { id, name, code, authorId, type: type || "app" };
    sharedApps.push(newApp);
    res.json({ success: true, app: newApp });
  });

  // List shared apps
  app.get("/api/shared/list", (req, res) => {
    res.json(sharedApps);
  });

  // Download an app
  app.get("/api/shared/download/:id", (req, res) => {
    const app = sharedApps.find(a => a.id === req.params.id);
    if (app) {
      res.json(app);
    } else {
      res.status(404).json({ error: "App not found" });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OS Network Server running on http://localhost:${PORT}`);
  });
}

startServer();
