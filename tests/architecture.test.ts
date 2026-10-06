import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../src/", import.meta.url));
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}
const files = new Set(sourceFiles(root));
const sources = new Map([...files].map((file) => [file, readFileSync(file, "utf8")]));
function imports(file: string) {
  const imports: string[] = [];
  const source = ts.createSourceFile(file, sources.get(file)!, ts.ScriptTarget.Latest, true);
  function visit(node: ts.Node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
      imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0]))
      imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}
const dependencies = new Map([...files].map((file) => [file, imports(file)]));
function localTarget(from: string, specifier: string) {
  const base = specifier.startsWith("@/") ? resolve(root, specifier.slice(2))
    : specifier.startsWith(".") ? resolve(dirname(from), specifier) : null;
  if (!base) return;
  return [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find((path) => files.has(path));
}

test("client entry points cannot reach server implementations through imports or re-exports", () => {
  const entries = [...sources].filter(([, source]) => /^\s*["']use client["'];/.test(source));
  assert.ok(entries.length > 0);
  for (const [entry] of entries) {
    const visited = new Set<string>();
    const queue = [entry];
    while (queue.length) {
      const file = queue.pop()!;
      if (visited.has(file)) continue;
      visited.add(file);
      for (const specifier of dependencies.get(file)!) {
        assert.ok(!specifier.startsWith("node:"), `${relative(root, entry)} reaches ${specifier}`);
        const target = localTarget(file, specifier);
        if (!target) continue;
        assert.ok(!relative(root, target).startsWith("server/"), `${relative(root, entry)} reaches ${relative(root, target)}`);
        queue.push(target);
      }
    }
  }
});

test("story and media models stay independent of editor UI, persistence and providers", () => {
  for (const file of files) {
    if (!/^modules\/(story|media)\//.test(relative(root, file)) || file.endsWith(".tsx")) continue;
    for (const specifier of dependencies.get(file)!) {
      assert.ok(!/^(react|next)(\/|$)/.test(specifier), `${relative(root, file)} imports ${specifier}`);
      const target = localTarget(file, specifier);
      if (target) assert.ok(!target.endsWith(".tsx"), "Model code must not import UI");
      if (target) assert.match(relative(root, target), /^modules\/(story|media)\//, `${relative(root, file)} crosses its model boundary`);
    }
  }
});
