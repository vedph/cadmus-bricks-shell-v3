# CadmusTextEd

📦 `@myrmidon/cadmus-text-ed`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

- [CadmusTextEd](#cadmustexted)
  - [Text Editing Service](#text-editing-service)
  - [Text Editing Plugin](#text-editing-plugin)
  - [Configuring the Service](#configuring-the-service)
    - [Global Configuration](#global-configuration)
    - [Local Configuration](#local-configuration)
  - [Linking to Monaco](#linking-to-monaco)
  - [Example](#example)
  - [History](#history)
    - [9.0.1](#901)

## Text Editing Service

The typical scenario is a Monaco-based editor, usually with Markdown text, where users require some assistance in adding inline annotations. Assistance ranges from trivial shortcut operations, like toggling bold or italic in Markdown, to more complex scenarios, where for instance you might want to add a hyperlink targeting an external or internal resource.

In these cases, you might imagine an editor where users type Markdown, and use shortcuts like CTRL+B for toggling bold (rather than manually typing or removing double asterisks), CTRL+I for italic (rather than manually typing or removing single asterisks), and CTRL+L for adding links.

When adding links, you might open a popup dialog with a lookup component like an asserted composite ID picker, so that when the user picks an entity a Markdown link is automatically created or updated with its identifier.

This is most useful in cases where you have free text comments with some hyperlinks to resources inside or outside the Cadmus database.

To ease the implementation of this scenario, the library provides service `CadmusTextEdService`. This is a simple host for plugins, which are used to edit the received text in some way.

Each plugin is a function that takes a text and an optional context object, and returns a promise with a result. For instance, there are stock plugins for toggling bold or italic in Markdown text. The service can be used in inline text editing, typically in Monaco-based editors with Markdown content.

## Text Editing Plugin

A plugin is a class implementing `CadmusTextEdPlugin`. It can be disabled by setting its `enabled` property to false, and besides some readonly metadata its logic requires just two functions, `matches` and `edit`, both receiving an object of type `CadmusTextEdQuery`.

The **query** object has a `selector`, an input `text`, and an optional `context` object of any type. The selector is any of these strings:

- `id`: select the plugin with the specified ID.
- `match-first`: select the first matching plugin.
- `match-all`: select all the matching plugins.

The plugin functions are `matches`, which returns true if the plugin matches, and `edit` which performs the actual edit. This function returns a `Promise<CadmusTextEdPluginResult>`, where the result has these properties:

- `query`: the input query.
- `text`: the edited output text.
- `ids`: an optional array with the IDs of all the plugins that have been applied to the text.
- `payloads`: an optional array with all the payload objects output by the plugin. This array has the same size of ids, so that those plugins which do not return a payload will have an undefined entry here.
- `error`: an optional error message. When this is not falsy, this means that the plugin encountered an error and usually the result is the same as the input text. As soon as an error occurs, the editing process stops and this error is set.

## Configuring the Service

To use the text editing service in your app, you just have to configure its options (`CadmusTextEdServiceOptions`). Currently, the only property in these options is the list of plugins.

The text editing service is not a singleton, so you must add `CadmusTextEdService` to the `providers` array of your standalone component, and you can configure each service instance as you prefer. This can be done in the constructor of your consumer component, or (most often) globally in application configuration.

### Global Configuration

If instead you want to configure plugins globally for all the instances you inject, in your app configuration add the desired plugins to `providers` via the specified injection token, like in this example:

```ts
// global configuration (app-config.ts or app.module.ts)
import {
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
} from '@myrmidon/cadmus-text-ed';
import {
  MdBoldCtePlugin,
  MdItalicCtePlugin,
  MdLinkCtePlugin,
} from '@myrmidon/cadmus-text-ed-md';
import { TxtEmojiCtePlugin } from '@myrmidon/cadmus-text-ed-txt';

// ...

providers: [
  // provide each single plugin
  MdBoldCtePlugin,
  MdItalicCtePlugin,
  TxtEmojiCtePlugin,
  MdLinkCtePlugin,
  // provide a factory so that plugins can be instantiated via DI
  {
    provide: CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
    useFactory: (
      mdBoldCtePlugin: MdBoldCtePlugin,
      mdItalicCtePlugin: MdItalicCtePlugin,
      txtEmojiCtePlugin: TxtEmojiCtePlugin,
      mdLinkCtePlugin: MdLinkCtePlugin
    ) => {
      return {
        plugins: [
          mdBoldCtePlugin,
          mdItalicCtePlugin,
          txtEmojiCtePlugin,
          mdLinkCtePlugin,
        ],
      };
    },
    deps: [
      MdBoldCtePlugin,
      MdItalicCtePlugin,
      TxtEmojiCtePlugin,
      MdLinkCtePlugin,
    ],
  },
  // monaco bindings for plugins
  // 2080 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB;
  // 2087 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI;
  // 2083 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE;
  // 2090 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL;
  {
    provide: CADMUS_TEXT_ED_BINDINGS_TOKEN,
    useValue: {
      2080: 'md.bold', // Ctrl+B
      2087: 'md.italic', // Ctrl+I
      2083: 'txt.emoji', // Ctrl+E
      2090: 'md.link', // Ctrl+L
    },
  },
]
```

This injection token is optionally injected into the service, so you just have to provide it to configure all the instances of the service in the same way. This way, whenever the service is injected, you will get a separate instance, but configured in the same way.

### Local Configuration

Alternatively, you can configure plugins per consumer. In this case, just inject into your consumer an unconfigured service, without setting the default configuration as explained above. This means that an instance of the service will be injected with no plugins; in this case, you have to add the desired plugins via its `configure` method.

⚠️ As plugins might require dependencies, to allow them be provided by DI you should create them via the [inject function](https://angular.io/api/core/inject) rather than just using `new`. Example:

```ts
// local configuration

import { inject } from '@angular/core';

// ... your consumer component class

constructor(private _editService: CadmusTextEdService) {
    this._editService.configure({
      plugins: [
        inject(MdBoldCtePlugin),
        inject(MdItalicCtePlugin),
        inject(MdEmojiCtePlugin),
      ],
    });
}
```

## Linking to Monaco

Even though the service is totally UI-agnostic, typically you use this service in connection with a Monaco editor instance, via [@jean-merelis/ngx-monaco-editor](https://github.com/jean-merelis/ngx-monaco-editor). This wrapper binds the editor's text to a form control, and gives you the underlying Monaco editor instance so you can manipulate its text for the edit shortcuts.

(1) inject the edit service in your component's constructor (`private _editService: CadmusTextEdService`).

(2) install the wrapper and Monaco (`npm i monaco-editor @jean-merelis/ngx-monaco-editor`), provide `NGX_MONACO_LOADER_PROVIDER` (with `DefaultMonacoLoader`) in your app configuration, and add the Monaco assets to `angular.json`:

```json
{
  "glob": "**/*",
  "input": "node_modules/monaco-editor/min/vs",
  "output": "vs"
}
```

(3) import `NgxMonacoEditorComponent` (and the `EditorInitializedEvent`/`StandaloneEditorConstructionOptions` types) from `@jean-merelis/ngx-monaco-editor` into your component's `imports`.

(4) add to your component the field for the editor instance, a form control for its text, and the initialization function bound to the `editorInitialized` event. This will call the utility function `applyEdit` to apply the plugin result. Typical **code**:

```ts
private _editor?: monaco.editor.IStandaloneCodeEditor;

// form control bound to the editor's text
public text: FormControl<string>;

public readonly editorOptions: StandaloneEditorConstructionOptions = {
  minimap: {
    side: 'left',
  },
  wordWrap: 'on',
  automaticLayout: true,
};

private async applyEdit(selector: string) {
  if (!this._editor) {
    return;
  }
  const selection = this._editor.getSelection();
  const text = selection
    ? this._editor.getModel()!.getValueInRange(selection)
    : '';

  const result = await this._editService.edit({
    selector,
    text: text,
  });

  this._editor.executeEdits('my-source', [
    {
      range: selection!,
      text: result.text,
      forceMoveMarkers: true,
    },
  ]);
}

public onEditorInit(event: EditorInitializedEvent) {
  this._editor = event.editor;

  // TODO: configure the desired plugins in one of these ways:
  // a) globally, if you inject into your component constructor:
  // @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN) @Optional() private _editorBindings?: CadmusTextEdBindings
  if (this._editorBindings) {
    Object.keys(this._editorBindings).forEach((key) => {
      const n = parseInt(key, 10);
      this._editor!.addCommand(n, () => {
        this.applyEdit(this._editorBindings![key as any]);
      });
    });
  }

  // b) manually, using the numeric key binding codes
  // (2080 = Ctrl+B, 2087 = Ctrl+I, 2083 = Ctrl+E, 2090 = Ctrl+L,
  // i.e. monaco.KeyMod.CtrlCmd | monaco.KeyCode.Key*)
  this._editor.addCommand(2080, () => this.applyEdit('md.bold'));
  this._editor.addCommand(2087, () => this.applyEdit('md.italic'));
  this._editor.addCommand(2083, () => this.applyEdit('txt.emoji'));
  this._editor.addCommand(2090, () => this.applyEdit('md.link'));

  // focus to editor
  this._editor.focus();
}
```

>If you pick the **global** configuration (which usually is the preferred choice), you must inject `CadmusTextEdBindings` into your consumer component constructor via token:

```ts
constructor(
   @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
   @Optional()
   private _editorBindings?: CadmusTextEdBindings
) {}
```

The **template** corresponding to the above code is like:

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

with these **styles**:

```css
#editor {
  height: 600px;
}
```

## Example

For an example usage with a Monaco editor instance see the [text editor service demo page](../../../src/app/text/text-ed-pg/text-ed-pg.component.ts).

This page has a UI where you can just set the parameters for a text edit operation, run it, and see the results; and a Monaco editor instance for Markdown, where you can use these shortcuts:

- Ctrl+B: [toggle bold](../cadmus-text-ed-md/README.md#toggle-bold).
- Ctrl+I: [toggle italic](../cadmus-text-ed-md/README.md#toggle-italic).
- Ctrl+E: [insert emoji](../cadmus-text-ed-txt/README.md#insert-unicode-emoji).
- Ctrl+L: [insert link](../cadmus-text-ed-md/README.md#insert-link).

## History

### 9.0.1

- 2025-09-10: updated package config.
