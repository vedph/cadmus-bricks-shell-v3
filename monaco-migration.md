# Prompt: migrate from @cisstech/nge to @jean-merelis/ngx-monaco-editor

Use this as a reusable prompt/plan when migrating another Angular workspace away
from `@cisstech/nge` (Monaco wrapper + Markdown renderer) to
`@jean-merelis/ngx-monaco-editor` + `marked`. Adjust paths/versions to the target
workspace before handing it to the assistant.

## Goal

Replace `@cisstech/nge` entirely in this workspace:

1. `NgeMonacoModule` (`@cisstech/nge/monaco`) → `@jean-merelis/ngx-monaco-editor`.
2. `NgeMarkdownModule` (`@cisstech/nge/markdown`), if present anywhere in the
   workspace → `marked` + Angular `DomSanitizer`.

At the end, `@cisstech/nge` must not appear in any `package.json`,
`ng-package.json`, import statement, or lockfile entry.

## Discovery (do this first)

1. Grep the whole workspace for `@cisstech/nge`, `NgeMonacoModule`,
   `NgeMarkdownModule`, `nge-monaco-editor`, `nge-markdown`, `monaco.editor.`,
   `monaco.KeyMod`, `monaco.KeyCode`. Build a complete list of files to touch —
   don't assume only one app/library uses it.
2. For each Monaco usage, identify whether it follows the
   `@myrmidon/cadmus-text-ed` plugin pattern (selector/text/context → result with
   ids/payloads/error, bound to Ctrl+B/I/E/L-style shortcuts via
   `CADMUS_TEXT_ED_BINDINGS_TOKEN`). If so, preserve that pattern — only the
   Monaco wrapper changes.
3. Check the current `monaco-editor` version in the root `package.json`.

## Package changes

### Root `package.json`

- Remove `"@cisstech/nge"`.
- Add `"@jean-merelis/ngx-monaco-editor": "^21.0.0"` (check npm for the latest
  version compatible with the workspace's Angular version first).
- Set `"monaco-editor"` to a version satisfying the installed
  `ngx-monaco-editor`'s peer dependency. Caret ranges on 0.x versions only allow
  patch bumps (`^0.47.0` ≡ `>=0.47.0 <0.48.0`), so pin exactly to what the wrapper
  wants, e.g. `"^0.47.0"`.
- Run `pnpm install`, then `pnpm peers check` (or equivalent) to confirm there's
  no unmet `monaco-editor` peer warning for `ngx-monaco-editor`.

### Any library using `NgeMarkdownModule`

- `package.json`: remove `@cisstech/nge` from `peerDependencies`/`dependencies`;
  add `"marked": "^18.0.5"` (or current major) to `dependencies`.
- `ng-package.json`: add `"marked"` to `allowedNonPeerDependencies` (same pattern
  as `cadmus-geo-location` uses for `@terraformer/wkt`).

## `angular.json` changes (per app target using Monaco)

Add a Monaco assets glob to the app's `build` target `assets` array, alongside
the existing assets entries:

```json
{
  "glob": "**/*",
  "input": "node_modules/monaco-editor/min/vs",
  "output": "vs"
}
```

## App configuration (`app.config.ts` or equivalent)

- Remove `import { NgeMonacoModule } from '@cisstech/nge/monaco';` and the
  `importProvidersFrom(NgeMonacoModule.forRoot({}))` provider (drop the
  `importProvidersFrom` import too if it becomes unused).
- Add:

```ts
import { DefaultMonacoLoader, NGX_MONACO_LOADER_PROVIDER } from '@jean-merelis/ngx-monaco-editor';

// in the providers array:
{
  provide: NGX_MONACO_LOADER_PROVIDER,
  useFactory: () => new DefaultMonacoLoader(),
},
```

## Per-component Monaco migration

For each component using `NgeMonacoModule`/`nge-monaco-editor`:

1. **Imports**: replace `NgeMonacoModule` with:

```ts
import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';
```

   Swap `NgeMonacoModule` → `NgxMonacoEditorComponent` in the component's
   `imports` array.

2. **Fields**: any field typed as `monaco.editor.IStandaloneCodeEditor` (or
   `IEditor`) becomes `StandaloneCodeEditor`. Remove any manually-created
   `monaco.editor.ITextModel` field/model — the new wrapper binds content via
   `[formControl]`/`[value]`, so manual `createModel`/`setModel` calls go away.

3. **Editor options** — add a field (used via `[options]`):

```ts
public readonly editorOptions: StandaloneEditorConstructionOptions = {
  minimap: { side: 'left' },
  wordWrap: 'on',
  automaticLayout: true,
};
```

4. **Init handler** — replace the old `(ready)="onEditorInit($event)"` handler
   (which received `monaco.editor.IEditor`) with one receiving
   `EditorInitializedEvent`:

```ts
public onEditorInit(event: EditorInitializedEvent) {
  this._editor = event.editor;

  // 2080 = Ctrl+B, 2087 = Ctrl+I, 2083 = Ctrl+E, 2090 = Ctrl+L
  // (monaco.KeyMod.CtrlCmd | monaco.KeyCode.Key*)
  this._editor.addCommand(2080, () => this.applyEdit('md.bold'));
  this._editor.addCommand(2087, () => this.applyEdit('md.italic'));
  this._editor.addCommand(2083, () => this.applyEdit('txt.emoji'));
  this._editor.addCommand(2090, () => this.applyEdit('md.link'));

  this._editor.focus();
}
```

   `event.monaco` (`{ editor, languages }`) does **not** expose `KeyMod`/
   `KeyCode`, so use the numeric codes directly — this matches the existing
   `CADMUS_TEXT_ED_BINDINGS_TOKEN` convention in `@myrmidon/cadmus-text-ed`. If
   the component already injects `CADMUS_TEXT_ED_BINDINGS_TOKEN`, iterate over
   its keys instead of hardcoding (see `using-monaco.md`).

5. **`applyEdit`/editing logic** — unchanged: `this._editor.getSelection()`,
   `this._editor.getModel()!.getValueInRange(...)`,
   `this._editor.executeEdits(...)` all keep working as before, since
   `event.editor` is the same standalone editor instance.

6. **Template** — replace:

```html
<div id="editor">
  <nge-monaco-editor style="--editor-height: 100%" (ready)="onEditorInit($event)" />
</div>
```

   with:

```html
<div id="editor">
  <ngx-monaco-editor
    [formControl]="editorText"
    [language]="'markdown'"
    [options]="editorOptions"
    (editorInitialized)="onEditorInit($event)"
  />
</div>
```

7. **CSS — important, do not skip**: the new wrapper's host element is
   `display: block; position: relative` with its Monaco container
   `position: absolute; inset: 0`. An absolutely-positioned child does not
   contribute to the host's auto height/width, so `<ngx-monaco-editor>` collapses
   to 0×0 even inside a sized container. Add:

```css
#editor {
  height: 600px; /* or whatever sizing the old container had */
}
#editor ngx-monaco-editor {
  display: block;
  width: 100%;
  height: 100%;
}
```

## Markdown rendering migration (`NgeMarkdownModule` → `marked`)

For each component using `NgeMarkdownModule`/`<nge-markdown [data]="...">`:

1. Remove the `NgeMarkdownModule` import/usage and any
   `* NOTE: requires ngx-markdown.` doc comments.
2. Add:

```ts
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
```

3. Inject `DomSanitizer` in the constructor.
4. Add a signal and update method:

```ts
public readonly previewHtml = signal<SafeHtml>('');

private updatePreview(): void {
  const html = marked.parse(this.text.value || '', { async: false }) as string;
  this.previewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
}
```

5. Call `updatePreview()` from the relevant `text.valueChanges` subscription
   (e.g. `this.text.valueChanges.pipe(debounceTime(50)).subscribe(() => this.updatePreview())`)
   and anywhere the control's value is set programmatically (e.g. when loading a
   note for editing), so the preview stays in sync without needing
   `{ emitEvent: false }`.
6. Template — replace:

```html
<div class="preview">
  <nge-markdown [data]="text.value || undefined"></nge-markdown>
</div>
```

   with:

```html
<div class="preview" [innerHTML]="previewHtml()"></div>
```

## TypeScript config

Check `tsconfig.app.json` (and any library tsconfigs) for `"monaco-editor"` in
the `types` array. The new wrapper does not rely on the global `monaco` UMD
namespace (it imports types from `monaco-editor/esm/...`), so this entry is no
longer needed — remove it if present, then rebuild to confirm no `TS2503: Cannot
find namespace 'monaco'` errors remain (fix any by using `StandaloneCodeEditor`/
`StandaloneEditorConstructionOptions` from `@jean-merelis/ngx-monaco-editor`
instead of the `monaco.editor.*` global types).

## Documentation

Update any READMEs documenting the old `nge-monaco-editor`/`nge-markdown` usage
to describe the new wrapper/`marked` setup (see `using-monaco.md` for the
canonical wording to copy from).

## Verification

1. `pnpm install` — confirm `@cisstech/nge` is gone from the lockfile and
   `@jean-merelis/ngx-monaco-editor` resolves with no unmet peer warnings.
2. Build every affected library (`pnpm run build-<lib>`).
3. Build the app(s) (`ng build <app> --configuration development`) — no
   `TS2503`/`TS2742` errors, no warnings mentioning `monaco` or `nge`.
4. Grep the workspace again for `@cisstech/nge`, `nge-monaco`, `nge-markdown` —
   must return nothing (code or docs).
5. Manually run each affected demo page in the browser:
   - The Monaco editor fills its container (correct width **and** height — this
     is the part that's easy to miss, see the CSS note above) and loads
     (`/vs/loader.js` returns 200).
   - Typing + the Ctrl+B/I/E/L (or equivalent) shortcuts apply edits correctly.
   - Any Markdown preview renders sanitized HTML via `marked` and updates live
     while typing.
