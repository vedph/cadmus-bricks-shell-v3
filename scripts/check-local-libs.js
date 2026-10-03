#!/usr/bin/env node
// Guards the resolution invariants for the local @myrmidon libraries under
// projects/myrmidon. Each of them must resolve ONLY through tsconfig.json's
// compilerOptions.paths -> ./dist/myrmidon/<lib>:
//
// 1. tsconfig.json must map every local library to its dist/ folder.
// 2. No local library may appear under node_modules/@myrmidon, neither as a
//    real directory (a published npm copy shadowing dist/ for
//    library-to-library imports, i.e. stale code) nor as a symlink into dist/
//    (a second resolution route that the Vite dev-server pre-bundles as a
//    separate module graph, i.e. NG0912 component ID collisions). This
//    typically happens when a local library gets added as a dependency of the
//    root package.json.
// 3. pnpm-workspace.yaml must list every local library both in `overrides`
//    and in `peerDependencyRules.ignoreMissing`, so that external packages
//    peer-depending on them never pull in a published copy.
// 4. The dev-server's prebundle.exclude (angular.json) must list every local
//    library (else Vite serves a frozen prebundle instead of dist/), and every
//    external @myrmidon package that imports a local library (e.g.
//    @myrmidon/taxo-store-picker -> cadmus-refs-lookup). Vite would prebundle
//    such a package with its own inlined copy of the local library, whose
//    imports of further local libraries it then resolves from node_modules,
//    where they are not ("Failed to resolve import ... from
//    .angular/cache/.../vite/deps/..."). Excluded, the package is bundled by
//    esbuild with the app code like in production: tsconfig paths resolve the
//    local libraries, and a single copy of each is used. Do NOT fix that error
//    by adding the local library to package.json (see 2).
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const libsDir = path.join(repoRoot, 'projects', 'myrmidon');

const localLibs = fs
  .readdirSync(libsDir)
  .filter((dir) => fs.existsSync(path.join(libsDir, dir, 'package.json')))
  .map(
    (dir) =>
      JSON.parse(fs.readFileSync(path.join(libsDir, dir, 'package.json'), 'utf8'))
        .name
  );

// tsconfig.json may contain comments, so strip them before parsing
const tsconfig = JSON.parse(
  fs
    .readFileSync(path.join(repoRoot, 'tsconfig.json'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
);
const paths = tsconfig.compilerOptions.paths || {};
const workspace = fs.readFileSync(
  path.join(repoRoot, 'pnpm-workspace.yaml'),
  'utf8'
);
const ignoreMissing =
  /ignoreMissing:\s*\n((?:[ \t]+-[^\n]*\n?)+)/.exec(workspace)?.[1] ?? '';

const errors = [];

for (const name of localLibs) {
  const scopedName = name.slice('@myrmidon/'.length);
  const expectedDist = path.join(repoRoot, 'dist', 'myrmidon', scopedName);

  // 1. tsconfig path
  const mapped = paths[name];
  if (
    !mapped ||
    !mapped.some((p) => path.resolve(repoRoot, p) === path.resolve(expectedDist))
  ) {
    errors.push(
      `tsconfig.json: compilerOptions.paths["${name}"] must map to ` +
        `./dist/myrmidon/${scopedName}.`
    );
  }

  // 2. nothing in node_modules
  const nodeModulesPath = path.join(
    repoRoot,
    'node_modules',
    '@myrmidon',
    scopedName
  );
  let stat = null;
  try {
    stat = fs.lstatSync(nodeModulesPath);
  } catch {
    // not present: fine
  }
  if (stat) {
    errors.push(
      `node_modules/@myrmidon/${scopedName} exists (` +
        (stat.isSymbolicLink()
          ? `symlink to ${fs.readlinkSync(nodeModulesPath)}`
          : 'real directory: a published npm copy') +
        '). Remove it from the root package.json dependencies (if listed ' +
        'there) and run pnpm install.'
    );
  }

  // 3. pnpm-workspace.yaml lists
  if (!workspace.includes(`'${name}': 'link:./dist/myrmidon/${scopedName}'`)) {
    errors.push(
      `pnpm-workspace.yaml: overrides is missing ` +
        `'${name}': 'link:./dist/myrmidon/${scopedName}'.`
    );
  }
  if (!ignoreMissing.includes(`'${name}'`)) {
    errors.push(
      `pnpm-workspace.yaml: peerDependencyRules.ignoreMissing is missing ` +
        `'${name}'.`
    );
  }
}

// 4. dev-server prebundle exclusions
const angular = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'angular.json'), 'utf8')
);
const localSet = new Set(localLibs);
const externalImporters = [];
const myrmidonModules = path.join(repoRoot, 'node_modules', '@myrmidon');
for (const dir of fs.existsSync(myrmidonModules)
  ? fs.readdirSync(myrmidonModules)
  : []) {
  const name = `@myrmidon/${dir}`;
  const fesm = path.join(myrmidonModules, dir, 'fesm2022');
  if (localSet.has(name) || !fs.existsSync(fesm)) continue;
  const imported = new Set();
  for (const file of fs.readdirSync(fesm).filter((f) => f.endsWith('.mjs'))) {
    const text = fs.readFileSync(path.join(fesm, file), 'utf8');
    for (const m of text.matchAll(/from\s*['"](@myrmidon\/[\w-]+)['"]/g)) {
      if (localSet.has(m[1])) imported.add(m[1]);
    }
  }
  if (imported.size) externalImporters.push({ name, imported: [...imported] });
}

for (const [project, def] of Object.entries(angular.projects)) {
  const serve = def.architect?.serve;
  if (serve?.builder !== '@angular/build:dev-server') continue;
  const exclude = new Set(serve.options?.prebundle?.exclude ?? []);
  for (const name of localLibs) {
    if (!exclude.has(name)) {
      errors.push(
        `angular.json: ${project} serve.options.prebundle.exclude is ` +
          `missing the local library '${name}'.`
      );
    }
  }
  for (const { name, imported } of externalImporters) {
    if (!exclude.has(name)) {
      errors.push(
        `angular.json: ${project} serve.options.prebundle.exclude is ` +
          `missing '${name}', which imports the local ` +
          `${imported.join(', ')}. Also exclude any of its own @myrmidon ` +
          'dependencies that are not in the root node_modules.'
      );
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error(`[check-local-libs] ${e}`);
  process.exit(1);
}

console.log(
  `[check-local-libs] OK: ${localLibs.length} local libraries resolve ` +
    'only via tsconfig paths (no copies or links in node_modules).'
);
