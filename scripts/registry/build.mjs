// Node here may not run TypeScript, so load build.ts through Vite's module runner.
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

await runnerImport(fileURLToPath(new URL("./build.ts", import.meta.url)), { configFile: false, logLevel: "warn" });
