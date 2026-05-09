import { describe, it, expect } from "vitest";

describe("Static web build serving configuration", () => {
  it("should have static file serving in server/_core/index.ts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../server/_core/index.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should import path and fs
    expect(content).toContain("import path from \"path\"");
    expect(content).toContain("import fs from \"fs\"");

    // Should serve static files from dist/client
    expect(content).toContain("express.static");
    expect(content).toContain("dist/client");

    // Should have SPA fallback for index.html
    expect(content).toContain("index.html");
    expect(content).toContain("sendFile");
  });

  it("should have build script that includes expo export", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    // Build script should include expo export for web
    expect(pkg.scripts.build).toContain("expo export");
    expect(pkg.scripts.build).toContain("--platform web");
    expect(pkg.scripts.build).toContain("dist/client");
  });

  it("should have generated static web build in dist/client", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const clientDir = path.resolve(__dirname, "../dist/client");

    // dist/client should exist with index.html
    expect(fs.existsSync(clientDir)).toBe(true);
    expect(fs.existsSync(path.join(clientDir, "index.html"))).toBe(true);
  });
});
