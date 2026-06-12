# Using Monaco in a Cadmus Angular app (`@jean-merelis/ngx-monaco-editor`)

This is a step-by-step guide for adding a Monaco-based editor to a new Angular
app or component, using `@jean-merelis/ngx-monaco-editor` — the wrapper used
across Cadmus workspaces. It optionally pairs with `@myrmidon/cadmus-text-ed`
(and the `cadmus-text-ed-md`/`cadmus-text-ed-txt` plugins) for inline editing
shortcuts (toggle bold/italic, insert link, insert emoji, etc.).

- [Using Monaco in a Cadmus Angular app (@jean-merelis/ngx-monaco-editor)](#using-monaco-in-a-cadmus-angular-app-jean-merelisngx-monaco-editor)
  - [1. Install](#1-install)
  - [2. Provide the Monaco loader](#2-provide-the-monaco-loader)
  - [3. Serve the Monaco assets](#3-serve-the-monaco-assets)
  - [4. Add the editor to a component](#4-add-the-editor-to-a-component)
  - [5. Size the editor (CSS)](#5-size-the-editor-css)
  - [6. Optional: wire up cadmus-text-ed editing shortcuts](#6-optional-wire-up-cadmus-text-ed-editing-shortcuts)
  - [7. Optional: Markdown preview with `marked`](#7-optional-markdown-preview-with-marked)
  - [Troubleshooting](#troubleshooting)

## 1. Install

```bash
npm i monaco-editor @jean-merelis/ngx-monaco-editor
```

Check the installed `@jean-merelis/ngx-monaco-editor` version's peer dependency
on `monaco-editor` and pin to a satisfying version. Caret ranges on 0.x versions
only allow patch bumps (e.g. `^0.47.0` ≡ `>=0.47.0 <0.48.0`), so if the wrapper
wants `^0.47.0`, don't install `monaco-editor@^0.52.x`.

## 2. Provide the Monaco loader

In `app.config.ts` (or the relevant module's providers):

```ts
import { DefaultMonacoLoader, NGX_MONACO_LOADER_PROVIDER } from '@jean-merelis/ngx-monaco-editor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...other providers
    {
      provide: NGX_MONACO_LOADER_PROVIDER,
      useFactory: () => new DefaultMonacoLoader(),
    },
  ],
};
```

## 3. Serve the Monaco assets

`DefaultMonacoLoader` loads Monaco's AMD bundle from `/vs` at runtime. Add an
assets entry to the app's `build` target in `angular.json`, alongside the
existing assets:

```json
"assets": [
  { "glob": "**/*", "input": "public" },
  {
    "glob": "**/*",
    "input": "node_modules/monaco-editor/min/vs",
    "output": "vs"
  }
]
```

After this, `GET /vs/loader.js` should return `200` when serving the app.

## 4. Add the editor to a component

Import the component and types:

```ts
import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';
```

Add `NgxMonacoEditorComponent` to the component's `imports` array (it's
standalone).

Component fields:

```ts
private _editor?: StandaloneCodeEditor;

// form control bound to the editor's text
public text: FormControl<string>;

public readonly editorOptions: StandaloneEditorConstructionOptions = {
  minimap: { side: 'left' },
  wordWrap: 'on',
  automaticLayout: true,
};

public onEditorInit(event: EditorInitializedEvent) {
  this._editor = event.editor;
  this._editor.focus();
}
```

Template:

```html
<div id="editor">
  <ngx-monaco-editor
    [formControl]="text"
    [language]="'markdown'"
    [options]="editorOptions"
    (editorInitialized)="onEditorInit($event)"
  />
</div>
```

The control's value stays in sync via `[formControl]` — there's no need to
manually create or set a Monaco text model.

## 5. Size the editor (CSS)

**This step is easy to miss and results in an editor that renders at 0×0 (or
collapses to a tiny box) even though its container looks correctly sized.**

`<ngx-monaco-editor>`'s host element is `display: block; position: relative`,
and its inner Monaco container is `position: absolute; inset: 0`. Absolutely
positioned children don't contribute to their parent's auto height/width, so the
`<ngx-monaco-editor>` host itself collapses unless it's given an explicit size.
Give the wrapping element a fixed/flex height, and make `ngx-monaco-editor` fill
it:

```css
#editor {
  height: 600px; /* or flex: 1, or whatever fits your layout */
}
#editor ngx-monaco-editor {
  display: block;
  width: 100%;
  height: 100%;
}
```

If the editor lives inside something that lazily renders/shows its content
(e.g. a `mat-tab`), `automaticLayout: true` (set above in `editorOptions`)
ensures Monaco re-measures itself once the container becomes visible/resized.

## 6. Optional: wire up cadmus-text-ed editing shortcuts

If you also use `@myrmidon/cadmus-text-ed` (see its README for plugin
configuration), bind keyboard shortcuts to plugin selectors in
`onEditorInit`:

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

private async applyEdit(selector: string) {
  if (!this._editor) {
    return;
  }
  const selection = this._editor.getSelection();
  const text = selection
    ? this._editor.getModel()!.getValueInRange(selection)
    : '';

  const result = await this._editService.edit({ selector, text });

  this._editor.executeEdits('my-source', [
    {
      range: selection!,
      text: result.text,
      forceMoveMarkers: true,
    },
  ]);
}
```

`event.monaco` (`{ editor, languages }`) does **not** expose `KeyMod`/`KeyCode`,
so use the numeric key-binding codes directly as shown above. These match the
`CADMUS_TEXT_ED_BINDINGS_TOKEN` convention — if you configure bindings globally
via that token, inject it and iterate instead of hardcoding:

```ts
constructor(
  @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
  @Optional()
  private _editorBindings?: CadmusTextEdBindings
) {}

// in onEditorInit:
if (this._editorBindings) {
  Object.keys(this._editorBindings).forEach((key) => {
    const n = parseInt(key, 10);
    this._editor!.addCommand(n, () => {
      this.applyEdit(this._editorBindings![key as any]);
    });
  });
}
```

## 7. Optional: Markdown preview with `marked`

For a live Markdown preview alongside the editor, use `marked` +
`DomSanitizer` rather than a separate Markdown-rendering wrapper:

```bash
npm i marked
```

```ts
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

public readonly previewHtml = signal<SafeHtml>('');

constructor(/* ... */ private _sanitizer: DomSanitizer) {}

private updatePreview(): void {
  const html = marked.parse(this.text.value || '', { async: false }) as string;
  this.previewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
}
```

Call `updatePreview()` from `text.valueChanges` (debounced) and whenever the
control's value is set programmatically:

```ts
this.text.valueChanges.pipe(debounceTime(50)).subscribe(() => {
  this.updatePreview();
});
```

Template:

```html
<div class="preview" [innerHTML]="previewHtml()"></div>
```

If publishing this in an Angular library, add `marked` to the library's
`dependencies` and to `allowedNonPeerDependencies` in `ng-package.json` (it's a
non-Angular runtime dependency).

## Troubleshooting

- **Editor renders as a 0×0 or tiny box**: see [Size the editor](#5-size-the-editor-css)
  above — the host element needs an explicit `width`/`height: 100%` plus a sized
  ancestor.
- **`TS2503: Cannot find namespace 'monaco'`**: don't rely on the global `monaco`
  UMD namespace. Import `StandaloneCodeEditor` /
  `StandaloneEditorConstructionOptions` (and any other types you need) from
  `@jean-merelis/ngx-monaco-editor` instead, and remove `"monaco-editor"` from
  `tsconfig` `types` arrays if present.
- **Unmet peer dependency on `monaco-editor`**: check
  `@jean-merelis/ngx-monaco-editor`'s `peerDependencies` and pin
  `monaco-editor` to a version inside that range (remember caret on 0.x only
  allows patch bumps).
- **`/vs/loader.js` returns 404**: the `angular.json` assets glob for
  `node_modules/monaco-editor/min/vs` is missing or the dev server needs a full
  restart (not just HMR) to pick up an `angular.json` change.
