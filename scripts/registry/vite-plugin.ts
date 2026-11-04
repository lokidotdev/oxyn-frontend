import type { Plugin } from "vite";
import { inlineRegistryFile } from "./inline.ts";

const QUERY = "?standalone";

/** `import source from "./x.tsx?standalone"` gives the shippable single-file source of a registry component. */
export function standaloneRegistry(): Plugin {
  return {
    name: "oxyn:standalone-registry",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!source.endsWith(QUERY)) return;
      const resolved = await this.resolve(source.slice(0, -QUERY.length), importer, { skipSelf: true });
      return resolved && resolved.id + QUERY;
    },
    load(id) {
      if (!id.endsWith(QUERY)) return;
      const { code, files } = inlineRegistryFile(id.slice(0, -QUERY.length));
      // Editing a lib module re-inlines every component that uses it.
      for (const file of files) this.addWatchFile(file);
      return `export default ${JSON.stringify(code)};`;
    },
  };
}
