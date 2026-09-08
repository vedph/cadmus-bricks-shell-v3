# NG0912 playbook for multi-library Angular/pnpm workspaces

For workspaces shaped like this one: an Angular CLI monorepo with several
independently-published libraries under `projects/<scope>/<lib>`, each with
its own `package.json`, consumed both by the workspace's own app and by
peer libraries, and sometimes by external published packages too (e.g.
`taxo-store-shell`'s `@myrmidon/taxo-store-picker` pulling in
`@myrmidon/cadmus-refs-lookup`).

`NG0912 "Component ID generation collision detected"` in this shape of
workspace is almost never a real naming collision between two different
components. It means **the same component class got loaded twice as two
distinct module instances** - usually because one consumer resolved the
library through the workspace's local build output and another resolved it
through a separately-installed (often stale) copy from the registry, or
because a dev-server dependency pre-bundler inlined a copy of it into
someone else's bundle. Treat every occurrence as a resolution-duplication
bug to be traced, not a name to rename.

Adjust `<SCOPE>` (e.g. `@myrmidon`), `<LIBS_DIR>` (e.g. `projects/myrmidon`)
and `<DIST_DIR>` (e.g. `dist/myrmidon`) to the workspace at hand. Everything
below assumes pnpm; adapt the diagnostic commands if the workspace uses
npm/yarn instead (the config-level fixes are pnpm-specific).

## Part A - workspace hygiene checklist (do this first, before chasing a warning)

Run through this whenever setting up a new workspace of this shape, adding
a new library, or adding a new external dependency that touches one.

1. **Every workspace library resolves through exactly one mechanism.**
   Check `tsconfig.json`'s `compilerOptions.paths`: every
   `<SCOPE>/<lib>` should map to `./<DIST_DIR>/<lib>` (the local build
   output), never left unmapped (which would silently fall back to
   `node_modules`).

2. **Cross-library imports use package specifiers, never relative paths.**
   A library that imports a sibling via `../../other-lib/src/...` cannot be
   published independently (ng-packagr will either inline the wrong copy or
   the built package will reference paths that don't exist for consumers).
   Audit:

   ```bash
   grep -rn "from ['\"]\.\./\.\./\.\./" <LIBS_DIR> --include=*.ts
   ```

   Any hit crossing out of a library's own folder is a bug - replace with
   `from '<SCOPE>/<lib>'`.

3. **Cross-library dependencies are `peerDependencies`, not `dependencies`.**
   If library A embeds library B's component/service/token, B must be a
   `peerDependency` of A with a semver range - the same pattern
   `@angular/material` uses for `@angular/cdk`. This is correct and should
   **not** be "fixed" by moving it to `dependencies`: peer deps get
   npm/pnpm's single-instance resolution behavior; plain deps don't, and
   moving to `dependencies` makes duplicate-instance bugs _more_ likely, not
   less.

4. **Every workspace library that any external (truly third-party,
   separately-published) package peer/deep-depends on has a pnpm
   `link:` override.** This is the step that's easy to miss and the most
   common real cause of NG0912 in this shape of workspace. Audit:

   ```bash
   node -e "
   const fs=require('fs');
   const dirs=fs.readdirSync('<LIBS_DIR>');
   const local=new Set();
   dirs.forEach(d=>{ try{ local.add(JSON.parse(fs.readFileSync('<LIBS_DIR>/'+d+'/package.json')).name); }catch(e){} });
   const base='node_modules/.pnpm';
   for (const d of fs.readdirSync(base).filter(x=>x.startsWith('<SCOPE_SLASH_TO_PLUS>'))) {
     const nm=base+'/'+d+'/node_modules/<SCOPE>';
     if(!fs.existsSync(nm)) continue;
     for (const p of fs.readdirSync(nm)) {
       const pj=nm+'/'+p+'/package.json';
       if(!fs.existsSync(pj)) continue;
       const pkg=JSON.parse(fs.readFileSync(pj,'utf8'));
       for (const dep of Object.keys(Object.assign({}, pkg.dependencies, pkg.peerDependencies))) {
         if (local.has(dep) && pkg.name!==dep) console.log(pkg.name, '->', dep);
       }
     }
   }
   "
   ```

   (`<SCOPE_SLASH_TO_PLUS>` = the scope with `/` replaced by `+`, e.g.
   `@myrmidon+`, matching pnpm's `.pnpm` folder naming.) Every `dep` printed
   here needs a `pnpm-workspace.yaml` override:

   ```yaml
   overrides:
     "<SCOPE>/<lib>": "link:./<DIST_DIR>/<lib>"
   ```

   It's cheap and safe to add this override for **every** workspace
   library up front, not just the ones currently flagged - a new external
   dependency can start peer-depending on a different one of your libraries
   at any time, and a missing `dist/` folder does not break `pnpm install`
   (the `link:` target is only resolved at module-load time, not
   install time - verified empirically: `pnpm install` succeeds even when
   the linked path doesn't exist yet).

5. **`angular.json`'s dev-server `prebundle.exclude` lists every workspace
   library.** This keeps Vite from caching a stale prebundled copy of your
   own libraries during `ng serve`, so local edits/rebuilds show up without
   a full server restart. This is necessary but **not sufficient** - see
   Part B, Step 3.

After steps 1-5, rebuild libraries and the app once (`pnpm install` after
any `pnpm-workspace.yaml` change) before moving on to diagnosis.

## Part B - diagnosing an actual NG0912 warning

### Step 1: Read the message precisely

The warning names pairs like `'_FooComponent' and '_FooComponent' with
selector 'app-foo'` - literally the same class name twice, not two
different classes. Collect the full list of distinct component names/
selectors reported; you'll need it in Step 2.

### Step 2: Establish ground truth against a clean production build

This is the single most important step: **NG0912 in `ng serve` and
NG0912 in `ng build` are different bugs with different fixes.** Never
"fix" the config based on dev-server symptoms alone.

```bash
rm -rf <DIST_DIR>            # local library build output
pnpm run build-lib           # or whatever rebuilds every library
rm -rf dist/<app>            # app build output
ng build
```

Then, for every selector from Step 1, count its definitions in the built
output (note: minified prod output has no space after the colon; use a
whitespace-tolerant pattern to be safe against either):

```bash
OUT="dist/<app>/browser"
for sel in "app-foo" "app-bar"; do
  echo -n "$sel: "
  grep -ro "selectors:[[:space:]]*\[\[\"$sel\"" "$OUT"/*.js | wc -l
done
```

- **Every selector shows exactly 1** -> there is no production bug. The
  warning is a `ng serve`-only artifact of Vite's dependency pre-bundler
  (go to Step 3). It's real console noise worth silencing, but nothing
  ships broken.
- **Any selector shows 2+** -> this is a real bug that ships to users. Go
  to Step 4.

### Step 3: If production is clean, confirm and fix the dev-server cause

`ng serve` (Angular 17+ / esbuild application builder) runs on Vite, which
pre-bundles npm dependencies into `.angular/cache/<ver>/<app>/vite/deps/`
for performance. `prebundle.exclude` (Part A, step 5) stops a listed
package from being pre-bundled _as its own entry_ - it does **not** stop
that package's code from being _inlined_ when some other, non-excluded
package statically imports it. An external package (`taxo-store-picker`,
say) that peer-depends on one of your workspace libraries will still get
that library's code baked into its own pre-bundle output as a second,
distinct copy.

To confirm this is what's happening, inspect the actual pre-bundled file:

```bash
# start the dev server, then from its startup log or network tab find the
# resolved path of the suspect external package's optimized-deps file,
# e.g. import ... from "/@fs/<abs-path>/.angular/cache/.../vite/deps/<scope>_<pkg>.js?v=..."
curl -s "http://localhost:4200/@fs/<abs-path-from-import>" -o /tmp/prebundled.js
grep -o 'selectors:[[:space:]]*\[\[[^]]*\]\]' /tmp/prebundled.js
```

If your workspace library's selectors show up inside a _different_
package's pre-bundle file, that's the duplicate.

**The fix - add the external package itself to `prebundle.exclude` -
is correct in principle, but verify its own dependency tree is cleanly
resolvable before flipping it, or you can take down the whole dev server:**
excluding a package makes Vite serve its real, un-bundled ESM source, which
means _its_ static imports now need to resolve directly too. If that
package in turn imports something that only exists nested inside pnpm's
private peer-dependency store (never hoisted to a location plain
`node_modules` resolution can reach), Vite will throw a hard
`Failed to resolve import "..."` error - on an eagerly-loaded chunk, this
breaks the entire app, not just a lazy route.

Before excluding an external package `<SCOPE>/<external>`:

```bash
# does every one of its own deps/peerDeps actually exist reachable from
# the top level, or only nested under its own private store folder?
node -e "console.log(require.resolve('<SCOPE>/<external-dependency>'))"
```

If something only resolves from within `<external>`'s own nested pnpm
folder, hoist it first by adding it as an explicit top-level `dependency`
in the app's root `package.json`, run `pnpm install`, and re-check. Only
then add `<SCOPE>/<external>` to `prebundle.exclude`, clear the cache
(`rm -rf .angular/cache`), restart `ng serve`, and re-verify with the
selector-count technique from Step 2 (repeat by fetching the dev server's
chunks the same way, or just trust the pre-bundle file is gone/no longer
contains those selectors).

If hoisting the external package's own deps isn't practical right now,
it's legitimate to leave this as a documented, known dev-console warning

- it does not affect what ships. Don't let it force a change to
  `peerDependencies` (Part A, step 3) or to `dependencies` as a workaround;
  those changes make the underlying resolution problem worse.

### Step 4: If production itself shows duplicates, find the real culprit

This means a registry-installed copy of one of your workspace libraries is
shipping in the app bundle alongside the local one. Find who's pulling it
in (usually a peer chain from an external package, same audit as Part A
step 4, but you may be looking for a _new_ culprit not yet covered by an
override):

```bash
node -e "
const fs=require('fs');
console.log(fs.realpathSync('node_modules/<SCOPE>/<the-duplicated-lib>'));
"
```

If that resolves outside `<DIST_DIR>`, add/verify the `pnpm-workspace.yaml`
`link:` override for it (Part A step 4), run `pnpm install`, rebuild
libraries and app, and re-run the Step 2 selector count until every
selector is back to exactly 1.

## Quick reference

| Symptom                                                          | Cause                                                                                                             | Fix                                                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NG0912 in both `ng build` and `ng serve`                         | pnpm installed a registry copy of a workspace library to satisfy an external peer dependency                      | `pnpm-workspace.yaml` `overrides` -> `link:./<DIST_DIR>/<lib>` for that library (Part A.4)                                                                         |
| NG0912 only in `ng serve`, `ng build` clean                      | Vite pre-bundler inlined a workspace library into another (non-excluded) external package's optimized-deps bundle | add that external package to `prebundle.exclude` too, but only after confirming its own deps are hoisted/resolvable (Part B.3) - or accept as known dev-only noise |
| A library won't publish standalone / breaks when installed alone | relative import crossing a library boundary                                                                       | replace with a `<SCOPE>/<lib>` package import (Part A.2)                                                                                                           |
| Duplicate service instances / DI surprises alongside NG0912      | a cross-library dependency declared as `dependencies` instead of `peerDependencies`                               | move it to `peerDependencies` (Part A.3) - do not remove it                                                                                                        |
