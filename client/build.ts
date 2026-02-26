import { readdir, rm, cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

const CLIENT_ROOT = import.meta.dir;
const PUBLIC_DIR = join(CLIENT_ROOT, "public");
const DEMOS_DIR = join(CLIENT_ROOT, "demos");

async function build() {
  console.log("Cleaning public directory...");
  await rm(PUBLIC_DIR, { recursive: true, force: true });
  await mkdir(PUBLIC_DIR, { recursive: true });

  console.log("Copying root index.html...");
  await cp(join(CLIENT_ROOT, "index.html"), join(PUBLIC_DIR, "index.html"));

  const entries = await readdir(DEMOS_DIR, { withFileTypes: true });
  const demos = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  for (const demoName of demos) {
    console.log(`\nBuilding demo: ${demoName}`);
    const demoPath = join(DEMOS_DIR, demoName);
    const demoOutputPath = join(PUBLIC_DIR, demoName);

    await mkdir(demoOutputPath, { recursive: true });

    // 1. Build Zig (if applicable)
    const zigPath = join(demoPath, "zig");
    // Use Bun's File/exists check
    const hasZig = await Bun.file(join(zigPath, "build.zig")).exists();

    if (hasZig) {
      console.log(`Building Wasm...`);
      // Run zig build inside the zig directory
      try {
        const buildCmd = `cd ${zigPath} && zig build -Doptimize=ReleaseSmall -- --import-memory-namespace env --import-memory-name memory`;
        console.log("Executing:", buildCmd);
        await $`${{ raw: buildCmd }}`;
        
        // Copy wasm file
        // Assuming standard location: zig/zig-out/bin/main.wasm
        const wasmSource = join(zigPath, "zig-out", "bin", "main.wasm");
        const wasmDest = join(demoOutputPath, "main.wasm");
        await cp(wasmSource, wasmDest);
        console.log(`Wasm built and copied.`);
      } catch (err) {
        console.error(`Zig build failed for ${demoName}:`, err);
        process.exit(1);
      }
    }

    // 2. Build JS/TS
    console.log(`Building JS/TS...`);
    const demoFiles = await readdir(demoPath, { withFileTypes: true });
    const entryPoints = demoFiles
      .filter((f) => f.isFile() && f.name.endsWith(".ts"))
      .map((f) => join(demoPath, f.name));

    if (entryPoints.length > 0) {
      const result = await Bun.build({
        entrypoints: entryPoints,
        outdir: demoOutputPath,
        target: "browser",
        minify: true,
      });

      if (!result.success) {
        console.error(`Build failed for ${demoName}:`, result.logs);
        process.exit(1);
      }
      console.log(`JS/TS built.`);
    }

    // 3. Copy index.html
    if (await Bun.file(join(demoPath, "index.html")).exists()) {
      await cp(join(demoPath, "index.html"), join(demoOutputPath, "index.html"));
      console.log(`Copied index.html.`);
    }
  }

  console.log("\nAll builds complete!");
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});