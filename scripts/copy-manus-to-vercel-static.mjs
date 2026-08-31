import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "server", "manus", "index_3.html");
const output = path.join(root, "dist", "client");
const routes = ["", "cars", "stats", "settings"];

await Promise.all(
  routes.map(async (route) => {
    const directory = path.join(output, route);
    await mkdir(directory, { recursive: true });
    await copyFile(source, path.join(directory, "index.html"));
  }),
);

console.log("[vercel] Manus HTML copied to static routes");