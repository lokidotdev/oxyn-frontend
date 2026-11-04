import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

/**
 * Turns a registry component into the single file users copy or install: every declaration it reaches in
 * `src/registry/lib` is pasted below the component, and everything it doesn't reach is left out.
 *
 * Lib modules may import only each other and packages. Lib code lands below the component, so the
 * component's module-level code may call lib functions but must not read lib `const`s.
 */
export function inlineRegistryFile(entry: string): { code: string; files: string[] } {
  const libs = new Map<string, Lib>();
  const root = parse(entry, false);
  const order: Lib[] = [];
  const visit = (file: string) => {
    if (libs.has(file)) return;
    const lib = parse(file, true);
    libs.set(file, lib);
    for (const dep of lib.deps) visit(dep);
    order.push(lib);
  };
  for (const dep of root.deps) visit(dep);

  // Which lib declaration each name refers to; names must be unique across lib modules.
  const owner = new Map<string, Decl>();
  for (const lib of order) {
    for (const decl of lib.decls) {
      for (const name of decl.names) {
        const prev = owner.get(name);
        if (prev) throw new Error(`${name} is declared in both ${prev.file} and ${lib.file}`);
        owner.set(name, decl);
      }
    }
  }

  const kept = new Set<Decl>();
  const queue = root.decls.flatMap((d) => [...d.refs]);
  while (queue.length) {
    const decl = owner.get(queue.pop()!);
    if (!decl || kept.has(decl)) continue;
    kept.add(decl);
    queue.push(...decl.refs);
  }

  const own = new Set(root.decls.flatMap((d) => d.names));
  for (const decl of kept) {
    for (const name of decl.names) if (own.has(name)) throw new Error(`${name} in ${entry} shadows the lib declaration in ${decl.file}`);
  }

  const libCode = order.flatMap((lib) => lib.decls.filter((d) => kept.has(d)).map((d) => d.text));
  const used = new Set([...root.decls, ...kept].flatMap((d) => [...d.refs]));
  const imports = mergeImports([root, ...order], used);

  const code = ['"use client";', imports, root.decls.map((d) => d.text).join("\n\n"), libCode.join("\n\n")].join("\n\n") + "\n";
  return { code, files: [entry, ...order.map((lib) => lib.file)] };
}

type Decl = { file: string; names: string[]; refs: Set<string>; text: string };
type PackageImport = { from: string; name: string; local: string; typeOnly: boolean };
type Lib = { file: string; deps: string[]; decls: Decl[]; imports: PackageImport[] };

function parse(file: string, isLib: boolean): Lib {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const deps: string[] = [];
  const decls: Decl[] = [];
  const imports: PackageImport[] = [];

  for (const statement of source.statements) {
    if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)) continue; // "use client"
    if (ts.isImportDeclaration(statement)) {
      const from = (statement.moduleSpecifier as ts.StringLiteral).text;
      if (from.startsWith(".")) {
        deps.push(resolveLib(file, from));
        continue;
      }
      const clause = statement.importClause;
      const named = clause?.namedBindings;
      if (!clause || clause.name || !named || !ts.isNamedImports(named)) throw new Error(`${file}: only named imports from packages are supported`);
      for (const el of named.elements) {
        imports.push({ from, name: (el.propertyName ?? el.name).text, local: el.name.text, typeOnly: clause.isTypeOnly || el.isTypeOnly });
      }
      continue;
    }
    decls.push({ file, names: declaredNames(statement), refs: references(statement), text: declarationText(statement, source, isLib) });
  }
  return { file, deps, decls, imports };
}

function resolveLib(from: string, specifier: string) {
  const base = resolve(dirname(from), specifier);
  for (const ext of [".ts", ".tsx"]) {
    try {
      readFileSync(base + ext);
      return base + ext;
    } catch {}
  }
  throw new Error(`${from}: cannot resolve ${specifier}`);
}

function declaredNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [d.name.text] : []));
  }
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name
  ) {
    return [statement.name.text];
  }
  if (ts.isExportAssignment(statement)) return [];
  throw new Error(`Unsupported top-level statement: ${statement.getText().slice(0, 60)}`);
}

/** Every identifier the statement could refer to, skipping property names (`a.b`, `{ b: 1 }`). */
function references(statement: ts.Statement) {
  const refs = new Set<string>();
  const walk = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
        ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)) &&
          parent.name === node) ||
        (ts.isQualifiedName(parent) && parent.right === node);
      if (!isPropertyName) refs.add(node.text);
    }
    ts.forEachChild(node, walk);
  };
  walk(statement);
  return refs;
}

/** The statement with its leading comments, minus any `export` keyword when it comes from a lib module. */
function declarationText(statement: ts.Statement, source: ts.SourceFile, isLib: boolean) {
  const full = statement.getFullText(source);
  const start = statement.getStart(source) - statement.getFullStart();
  const leading = full.slice(0, start).replace(/^\s+/, "");
  const code = full.slice(start);
  return leading + (isLib ? code.replace(/^export /, "") : code);
}

function mergeImports(files: Lib[], used: Set<string>) {
  const byPackage = new Map<string, { values: Set<string>; types: Set<string> }>();
  for (const file of files) {
    for (const imp of file.imports) {
      if (!used.has(imp.local)) continue;
      if (imp.local !== imp.name) throw new Error(`${file.file}: renamed imports are not supported`);
      const entry = byPackage.get(imp.from) ?? { values: new Set(), types: new Set() };
      byPackage.set(imp.from, entry);
      (imp.typeOnly ? entry.types : entry.values).add(imp.name);
    }
  }
  const lines: string[] = [];
  for (const [from, { values, types }] of byPackage) {
    for (const name of values) types.delete(name);
    if (values.size) lines.push(`import { ${[...values].sort().join(", ")} } from "${from}";`);
    if (types.size) lines.push(`import type { ${[...types].sort().join(", ")} } from "${from}";`);
  }
  return lines.join("\n");
}
