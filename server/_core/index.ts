import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function getManusIndexPath() {
  return path.resolve(process.cwd(), "server/manus/index_3.html");
}

function getManusAssetPath(fileName: string) {
  return path.resolve(process.cwd(), "server/manus", fileName);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Email API routes
  const emailRouter = (await import("../routes/email")).default;
  app.use("/api/email", emailRouter);

  const lineRouter = (await import("../routes/line")).default;
  app.use("/api/line", lineRouter);

  const reservationsRouter = (await import("../routes/reservations")).default;
  app.use("/api/reservations", reservationsRouter);

  app.get("/manifest.webmanifest", (_req, res, next) => {
    const manifestPath = getManusAssetPath("manifest.webmanifest");
    if (!fs.existsSync(manifestPath)) {
      next();
      return;
    }
    res.type("application/manifest+json").sendFile(manifestPath);
  });

  const manusIconFiles = [
    "favicon.ico",
    "favicon-32.png",
    "favicon-64.png",
    "icon-192.png",
    "icon-512.png",
    "apple-touch-icon.png",
  ];
  for (const fileName of manusIconFiles) {
    app.get(`/${fileName}`, (_req, res, next) => {
      const assetPath = getManusAssetPath(fileName);
      if (!fs.existsSync(assetPath)) {
        next();
        return;
      }
      res.sendFile(assetPath);
    });
  }

  app.get("/", (_req, res, next) => {
    const manusIndexPath = getManusIndexPath();
    if (!fs.existsSync(manusIndexPath)) {
      next();
      return;
    }
    res.sendFile(manusIndexPath);
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Serve static web build in production
  // In dev: server/_core/index.ts -> ../../dist/client
  // In prod (esbuild bundle): dist/index.js -> ./client
  const devClientDir = path.resolve(import.meta.dirname ?? __dirname, "../../dist/client");
  const prodClientDir = path.resolve(import.meta.dirname ?? __dirname, "./client");
  const clientDir = fs.existsSync(prodClientDir) ? prodClientDir : devClientDir;
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    // SPA fallback: serve index.html for any non-API route
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ error: "Not Found" });
        return;
      }
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
