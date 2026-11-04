/**
 * Writes the shippable single-file components to `generated/registry/` and `registry.json` from the
 * state catalog, so the catalog is the one place a state is declared. `shadcn build` runs after this.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runnerImport } from "vite";
import type { InlineConfig } from "vite";
import type { StateDefinition } from "../../src/features/states/types.ts";
import { standaloneRegistry } from "./vite-plugin.ts";

const root = resolve(import.meta.dirname, "../..");
const outDir = join(root, "generated/registry");
const config: InlineConfig = {
  root,
  configFile: false,
  logLevel: "warn",
  resolve: { tsconfigPaths: true },
  plugins: [standaloneRegistry()],
};

const { module } = await runnerImport<{ states: StateDefinition[] }>(join(root, "src/features/states/index.ts"), config);

rmSync(outDir, { recursive: true, force: true });
const items = [];
for (const state of module.states) {
  const path = `generated/registry/${state.slug}/${state.fileName}`;
  mkdirSync(join(root, "generated/registry", state.slug), { recursive: true });
  writeFileSync(join(root, path), state.source);

  // The shipped file must stand on its own: evaluate it and check it exports the component.
  const shipped = await runnerImport<Record<string, unknown>>(join(root, path), config);
  if (typeof shipped.module[state.componentName] !== "function") throw new Error(`${path} does not export ${state.componentName}`);

  items.push({
    name: state.slug,
    type: "registry:component",
    title: state.name,
    description: state.summary,
    files: [{ path, type: "registry:component" }],
  });
}

const registry = { $schema: "https://ui.shadcn.com/schema/registry.json", name: "oxyn", homepage: "http://localhost:3000", items };
writeFileSync(join(root, "registry.json"), JSON.stringify(registry, null, 2) + "\n");
console.log(`registry: ${items.length} components`);
