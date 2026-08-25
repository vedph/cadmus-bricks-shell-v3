#!/usr/bin/env node
/**
 * Builds every library under projects/myrmidon into dist/myrmidon, in
 * dependency order derived from their package.json files.
 *
 * Why this exists: the libraries resolve through tsconfig.json's
 * compilerOptions.paths -> ./dist/myrmidon/<name>, so a source change only
 * reaches the app (and other libraries) once that library has been rebuilt.
 * Rebuilding one library by hand and forgetting its dependents is what makes
 * the browser run stale code that contradicts the source.
 *
 * Usage:
 *   node scripts/build-libs.mjs              build all, in order
 *   node scripts/build-libs.mjs <name>...    build these and everything
 *                                            downstream of them
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const NG = join('node_modules', '@angular', 'cli', 'bin', 'ng.js');

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const LIBS_DIR = join(ROOT, 'projects', 'myrmidon');

// --- read the libraries and their local dependencies ---------------------
const manifests = readdirSync(LIBS_DIR)
  .map((dir) => join(LIBS_DIR, dir, 'package.json'))
  .filter(existsSync)
  .map((p) => JSON.parse(readFileSync(p, 'utf8')));

const local = new Set(manifests.map((m) => m.name));
const deps = new Map(
  manifests.map((m) => [
    m.name,
    [
      ...Object.keys(m.peerDependencies ?? {}),
      ...Object.keys(m.dependencies ?? {}),
    ].filter((d) => local.has(d)),
  ]),
);

// --- guard: a local library must never be installed into node_modules ----
// It would shadow dist/ for library-to-library imports and silently run a
// published build instead of this workspace's source.
const installed = [...local].filter((name) =>
  existsSync(join(ROOT, 'node_modules', ...name.split('/'))),
);
if (installed.length) {
  console.error(
    'ERROR: these workspace libraries are present in node_modules and will ' +
      'shadow dist/:\n  ' +
      installed.join('\n  ') +
      '\nRemove them; they must resolve only through tsconfig paths. See the ' +
      'peerDependencyRules.ignoreMissing block in pnpm-workspace.yaml.',
  );
  process.exit(1);
}

// --- topological order ---------------------------------------------------
const order = [];
const state = new Map();
function visit(name, stack = []) {
  if (state.get(name) === 'done') return;
  if (state.get(name) === 'visiting') {
    throw new Error(`dependency cycle: ${[...stack, name].join(' -> ')}`);
  }
  state.set(name, 'visiting');
  for (const dep of deps.get(name).sort()) visit(dep, [...stack, name]);
  state.set(name, 'done');
  order.push(name);
}
[...local].sort().forEach((n) => visit(n));

// --- optional filter: the named libraries plus everything downstream -----
let targets = order;
const requested = process.argv.slice(2);
if (requested.length) {
  const wanted = new Set(
    requested.map((r) => (r.startsWith('@myrmidon/') ? r : `@myrmidon/${r}`)),
  );
  for (const name of wanted) {
    if (!local.has(name)) {
      console.error(`ERROR: unknown library "${name}"`);
      process.exit(1);
    }
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, d] of deps) {
      if (!wanted.has(name) && d.some((x) => wanted.has(x))) {
        wanted.add(name);
        grew = true;
      }
    }
  }
  targets = order.filter((n) => wanted.has(n));
}

// --- build ---------------------------------------------------------------
console.log(`Building ${targets.length} librar${targets.length === 1 ? 'y' : 'ies'}:\n`);
for (const [i, name] of targets.entries()) {
  process.stdout.write(`[${i + 1}/${targets.length}] ${name} ... `);
  try {
    execFileSync(process.execPath, [join(ROOT, NG), 'build', name], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log('ok');
  } catch (err) {
    console.log('FAILED\n');
    process.stderr.write(String(err.stdout ?? '') + String(err.stderr ?? ''));
    process.exit(1);
  }
}
console.log('\nAll libraries built into dist/myrmidon.');
