# CadmusTextSegment

📦 `@myrmidon/cadmus-text-segment`

- [CadmusTextSegment](#cadmustextsegment)
  - [Concepts](#concepts)
    - [Segments and Blocks](#segments-and-blocks)
    - [Selection](#selection)
    - [Segmenters and Coordinates](#segmenters-and-coordinates)
  - [Requirements](#requirements)
  - [Quick Start](#quick-start)
  - [Components](#components)
    - [SegmentedTextView](#segmentedtextview)
    - [TextSegmentBlockView](#textsegmentblockview)
    - [TextSegmentView](#textsegmentview)
  - [Settings](#settings)
    - [Tips](#tips)
  - [User Interaction](#user-interaction)
  - [Services and Utilities](#services-and-utilities)
    - [SegmentedTextStore](#segmentedtextstore)
    - [TextMeasureService](#textmeasureservice)
    - [Pure Functions](#pure-functions)
  - [Writing a Segmenter](#writing-a-segmenter)
  - [SpacedTextSegmenter](#spacedtextsegmenter)
  - [Theming](#theming)
  - [Performance](#performance)
  - [History](#history)
    - [0.0.1](#001)

A viewer for **segmented text**, letting users select arbitrary portions of it like they would select text in a plain text editor.

A segmented text is a text split into _segments_, each being an arbitrarily defined portion of it: a single character, a word, a syllable, a grapheme cluster, or any other sequence of characters. Segments are grouped into _blocks_ (e.g. lines or paragraphs).

This library has **no segmentation logic at all**: segmentation is up to your code, typically via a service implementing the `TextSegmenter` interface. The components are agnostic: they just display the segments they are bound to, and let users select them according to the rules attached to each segment.

This library provides:

- 🖼️ `SegmentedTextView`: the full viewer, with a scrollable text, zoom, find, and (when a segmenter is available) a coordinates box synchronized with the selection.
- 🧱 `TextSegmentBlockView` and `TextSegmentView`: the dumb building blocks of the viewer, rendering a block and a segment.
- 🧠 `SegmentedTextStore`: the DOM-independent selection, navigation and search logic.
- ✂️ `SpacedTextSegmenter`: a sample segmenter (one segment per character, one block per line) with token-based coordinates, useful as a reference implementation and for testing.

## Concepts

### Segments and Blocks

A **segment** (`TextSegment<T>`) has:

- `id`: an arbitrary numeric ID, unique in the whole text.
- `index`: an ordinal defined by the segmentation logic (e.g. the offset of a character in the source text). This is informative only: there can be holes in its sequence (e.g. when skipping CR+LF). The viewer orders segments by their position in blocks.
- `value`: the text value. This is what the finder searches.
- `label`: the text displayed, falling back to `value` (e.g. `_` for a space, or `␉` for a tab).
- `tip`: an optional precomputed tip.
- `payload`: an optional data object of type `T`, the same for all the segments of a text, carrying any metadata your logic needs (and usable for tips).
- `selectionMode`: how the segment takes part in a selection (see below).
- `color`, `textColor`, `borderColor`: optional colors overriding the defaults from settings. Your logic can use them to visually represent metadata.
- `cssClass`: optional CSS class(es) for the segment's host element.

A **block** (`TextSegmentBlock<T>`) is just an `index` (0-N) and an array of `segments`. A block can be empty (e.g. an empty line).

Segments are **pure data**: they never carry view state like selection or search results, which is kept by the viewer. So you should treat them as immutable: to change a segment, replace it (and its block) with a new object.

### Selection

The selection is **linear**, like in a text editor: it always spans all the segments between a start and an end segment, across blocks. Every segment has a `selectionMode`:

| mode                  | start/end here | included when wrapped | crossable | example                                |
| --------------------- | -------------- | --------------------- | --------- | -------------------------------------- |
| `allowed` (default)   | yes            | yes                   | yes       | a letter                               |
| `wrapped`             | no             | yes                   | yes       | a space between words                  |
| `attached`            | no (\*)        | yes                   | yes       | a combining diacritic after its letter |
| `blocked`             | no             | no                    | **no**    | a boundary no selection may cross      |

(\*) An `attached` segment is glued to the segment preceding it: when that segment ends a selection, all its attached segments are included too; and a selection starting at an attached segment starts at its base instead. Use it to avoid splitting grapheme clusters like `e` + `U+0301`.

When dragging or extending a selection towards or beyond a `blocked` segment, the selection stops before it.

### Segmenters and Coordinates

A `TextSegmenter<T>` encapsulates the whole segmentation logic:

```ts
interface TextSegmenter<T = unknown> {
  // get blocks of segments from the specified text
  getBlocks(text?: string): TextSegmentBlock<T>[];
  // get the coordinates of the specified (selected) segments
  getSegmentCoords(
    blocks: readonly TextSegmentBlock<T>[],
    segments: readonly TextSegment<T>[],
  ): string;
  // get the segments included by the coordinates, or null if invalid
  getCoordsSegments(
    blocks: readonly TextSegmentBlock<T>[],
    coords: string,
  ): TextSegment<T>[] | null;
}
```

_Coordinates_ are a textual representation of a selection in a syntax defined by the segmenter (e.g. `1.2@2x2`). The viewer uses them only through the segmenter, and only if one is available: it shows the coordinates of the current selection, and lets users select by typing coordinates. Both coordinate methods get the blocks of the whole text, because coordinates are usually relative to the text structure (blocks, tokens, etc.), which cannot be derived from the selected segments alone.

## Requirements

- Angular Material with an M3 theme: the default colors are `--mat-sys-*` tokens.
- the Material Icons font (for the toolbar icons).
- the CDK overlay styles (included by Angular Material's core styles), for the tip popup.

## Quick Start

▶️ (1) install the package:

```bash
npm i @myrmidon/cadmus-text-segment
```

▶️ (2) get the blocks from your segmentation logic, and bind them to the viewer. Here we use the sample `SpacedTextSegmenter`:

```ts
import { Component, computed, signal } from "@angular/core";
import {
  SegmentedTextView,
  SpacedTextSegmenter,
  TextSegmentSelection,
} from "@myrmidon/cadmus-text-segment";

@Component({
  selector: "app-text",
  imports: [SegmentedTextView],
  template: `
    <div style="height: 400px">
      <cadmus-segmented-text-view
        [blocks]="blocks()"
        [segmenter]="segmenter"
        [settings]="{ showIdBox: true }"
        [(selectedIds)]="selectedIds"
        (selectionChange)="onSelectionChange($event)"
      />
    </div>
  `,
})
export class TextComponent {
  public readonly segmenter = new SpacedTextSegmenter();
  public readonly text = signal("alpha beta\ngamma");
  public readonly blocks = computed(() =>
    this.segmenter.getBlocks(this.text()),
  );
  public readonly selectedIds = signal<number[]>([]);

  public onSelectionChange(selection: TextSegmentSelection): void {
    console.log(selection.coords, selection.segments);
  }
}
```

The viewer takes **all the space of its container**: give the container a height (or place it in a flex layout).

▶️ (3) optionally, instead of binding the `segmenter` input, provide a segmenter for all the viewers in an injector via the `TEXT_SEGMENTER` token:

```ts
import { TEXT_SEGMENTER, SpacedTextSegmenter } from "@myrmidon/cadmus-text-segment";

// providers:
{ provide: TEXT_SEGMENTER, useValue: new SpacedTextSegmenter() },
```

The `segmenter` input, when set, takes precedence over the injected one.

## Components

### SegmentedTextView

- 🔑 `SegmentedTextView<T>`
- 🚩 `cadmus-segmented-text-view`
- ▶️ input:
  - `blocks` (`readonly TextSegmentBlock<T>[]`): the blocks to display.
  - `settings` (`Partial<SegmentedTextSettings>`): display settings; any missing setting gets its default from `DEFAULT_SEGMENTED_TEXT_SETTINGS`.
  - `segmenter` (`TextSegmenter<T>`): the segmenter for coordinates. If not set, the one provided by `TEXT_SEGMENTER` is used, if any. Without a segmenter, the coordinates box is hidden.
  - `showZoom` (`boolean`, default `true`): show the zoom control.
  - `showFind` (`boolean`, default `true`): show the find control.
  - `showCoords` (`boolean`, default `true`): show the coordinates box (when a segmenter is available).
  - `ariaLabel` (`string`): the accessible label of the text.
- 🔁 model:
  - `selectedIds` (`number[]`): the IDs of the selected segments, in text order. Setting it selects the specified segments (bypassing selection modes), sorted in text order, ignoring unknown IDs. It does not emit `selectionChange`.
- 🔥 output:
  - `selectionChange` (`TextSegmentSelection<T>`): emitted whenever the user makes a new selection, with the selected `ids` and `segments` in text order, and their `coords` when a segmenter is available. When dragging, it is emitted once at the end of the drag.
- ⚙️ public methods: `scrollToSegment(id)`, `clearSelection()`, `goToMatch(dir)`.

When `blocks` change, the selection is kept for the segments whose IDs are still present.

The bottom toolbar has:

- a **zoom** slider (50%-300%) with a reset button. You can also zoom with CTRL+wheel on the text.
- a **find** box: matches are highlighted with the result color until the search is cleared. Enter and SHIFT+Enter (or the arrow buttons) go to the next or previous match, selecting it. The 🔗 toggle switches between finding text within each single segment (default), or across segments (concatenating the values of the segments of each block, so that e.g. `ta` matches across the two segments `t` and `a`). Matches never cross block boundaries. `Aa` toggles case sensitivity.
- the **coordinates** box: it shows the coordinates of the selection, and selects the segments corresponding to the coordinates typed in it (after a short debounce, `SEGMENTED_TEXT_COORDS_DEBOUNCE`). Invalid coordinates are flagged.

### TextSegmentBlockView

- 🔑 `TextSegmentBlockView`
- 🚩 `cadmus-text-segment-block-view`
- ▶️ input:
  - `block` (`TextSegmentBlock`, required).
  - `settings` (`SegmentedTextSettings`): full (resolved) settings.
  - `selectedIds` (`ReadonlySet<number>`): the selected segment IDs.
  - `hitIds` (`ReadonlySet<number>`): the IDs of segments in search results.
  - `caretId` (`number | null`): the ID of the segment with the caret.

A row of segment views, reflowing to the next line like characters in a paragraph, optionally preceded by the block number (index + 1).

### TextSegmentView

- 🔑 `TextSegmentView`
- 🚩 `cadmus-text-segment-view`
- ▶️ input:
  - `segment` (`TextSegment`, required).
  - `settings` (`SegmentedTextSettings`): full (resolved) settings.
  - `selected`, `hit`, `caret` (`boolean`).

A single SVG with, stacked from top to bottom: the **text box** (a rounded rectangle whose height is set by settings, and whose width fits the label), and optionally the **ID box**, the **index box**, and the **tip box** (when the tip position is `below`).

The host element carries the segment ID in its `data-seg-id` attribute, and the classes `selected`, `hit`, `caret`, `mode-<selectionMode>` (for non-allowed modes), plus the segment's `cssClass`. Both dumb components have no outputs: the viewer handles all the pointer events by delegation, using `data-seg-id`.

## Settings

`SegmentedTextSettings` (all the properties are optional when passed to the viewer; defaults are in `DEFAULT_SEGMENTED_TEXT_SETTINGS`, and `resolveSegmentedTextSettings(partial)` merges them):

| setting                   | default                                  | description                                            |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `segmentOffset`           | `2`                                      | horizontal gap (px) between segments                   |
| `lineOffset`              | `6`                                      | vertical gap (px) between wrapped lines of a block     |
| `blockOffset`             | `12`                                     | vertical gap (px) between blocks                       |
| `showBlockNumbers`        | `true`                                   | show block numbers                                     |
| `showIdBox`               | `false`                                  | show ID boxes                                          |
| `showIndexBox`            | `false`                                  | show index boxes                                       |
| `showTipBox`              | `false`                                  | show tips (below or as popup)                          |
| `color`                   | `var(--mat-sys-surface-container-low)`   | text box fill                                          |
| `textColor`               | `var(--mat-sys-on-surface)`              | text color                                             |
| `borderColor`             | `var(--mat-sys-outline-variant)`         | text box border                                        |
| `selectionColor`          | `var(--mat-sys-primary)`                 | fill of selected segments                              |
| `selectionTextColor`      | `var(--mat-sys-on-primary)`              | text of selected segments                              |
| `resultColor`             | `var(--mat-sys-tertiary-container)`      | fill of search results                                 |
| `resultTextColor`         | `var(--mat-sys-on-tertiary-container)`   | text of search results                                 |
| `caretColor`              | `var(--mat-sys-primary)`                 | outline of the segment with the caret                  |
| `fontFace`, `fontSize`    | Roboto, `18px`                           | text font                                              |
| `textRectHeight`          | `28`                                     | text box height (px)                                   |
| `textRectMinWidth`        | `10`                                     | text box minimum width (px), to show e.g. spaces       |
| `textRectPadding`         | `3`                                      | horizontal padding (px) around the text                |
| `textRectRadius`          | `4`                                      | corner radius (px) of boxes                            |
| `textRectStrokeWidth`     | `1`                                      | text box border width (px)                             |
| `textRectStrokeDasharray` | -                                        | text box border dash array, e.g. `4 2`                 |
| `infoFontFace`            | Roboto Mono                              | ID and index boxes font family                         |
| `infoFontSize`            | `10px`                                   | ID and index boxes font size                           |
| `infoRectHeight`          | `14`                                     | ID and index boxes height (px)                         |
| `tipFontFace`             | Roboto                                   | tip font family                                        |
| `tipFontSize`             | `10px`                                   | tip font size                                          |
| `tipRectHeight`           | `14`                                     | tip box height (px) when below                         |
| `tipTemplate`             | -                                        | tip template (see below)                               |
| `tipFn`                   | -                                        | tip function (see below)                               |
| `tipComponent`            | -                                        | tip component (see below)                              |
| `tipMaxLength`            | `30`                                     | max textual tip length, truncated with an ellipsis     |
| `tipPosition`             | `popup`                                  | `below` the segment or as a `popup` on hover           |

The selection color replaces the segment's own color while selected (and the result color replaces it while matching a search), without altering the segment data.

### Tips

The tip of a segment comes from the first available among:

1. `tipComponent`: a component rendering the tip, for a fully custom visualization. It gets the segment bound to its `segment` input (see `TextSegmentTipComponent`). When below, it is rendered in an SVG `foreignObject` of the segment's width and `tipRectHeight` height.
2. `tipFn`: a function returning the tip text from a segment.
3. `tipTemplate`: a template whose placeholders in `{{...}}` are dot-separated paths into the segment's payload, or `$id`, `$index`, `$value`, `$label` for the segment's own properties. Unresolved placeholders are removed, and the result is trimmed. For instance, with payload `{ "uni": { "category": "Ll" } }`, the template `cat.='{{uni.category}}' {{notdefined}}` gives `cat.='Ll'`.
4. the segment's own `tip`.

```ts
settings = {
  showTipBox: true,
  tipPosition: "popup",
  tipTemplate: "{{code}} {{category}}",
};
```

```ts
@Component({
  selector: "app-unicode-tip",
  template: `{{ segment()?.payload?.code }}`,
})
export class UnicodeTipComponent {
  public readonly segment = input<TextSegment<UnicodePayload>>();
}

settings = { showTipBox: true, tipComponent: UnicodeTipComponent };
```

## User Interaction

With the pointer:

- **click** a segment to select it.
- **drag** to select all the segments from the start to the end of the drag; dragging near the top or bottom edge scrolls the text.
- **SHIFT+click** to extend the selection from the last clicked segment.

With the keyboard, when the text has focus (click it or reach it with TAB):

| keys                       | action                                                  |
| -------------------------- | ------------------------------------------------------- |
| ← →                        | move the caret to the previous/next selectable segment  |
| SHIFT+← →                  | extend or collapse the selection                        |
| ↑ ↓ (+SHIFT)               | move (or extend) to the same place in prev/next block   |
| HOME/END (+SHIFT)          | move (or extend) to the start/end of the block          |
| CTRL+HOME/END (+SHIFT)     | move (or extend) to the start/end of the text           |
| CTRL+A                     | select all (up to the first blocked segment)            |
| ESC                        | clear the selection                                     |

These shortcuts are handled only while the text has focus, so they do not conflict with the browser's or the page's ones. ESC is not consumed when there is nothing to clear, so it can still close e.g. a containing dialog.

Every new selection replaces the previous one. The segment with the caret is outlined.

## Services and Utilities

### SegmentedTextStore

`SegmentedTextStore<T>` contains all the selection, navigation and search logic, independently from the DOM. Each `SegmentedTextView` provides its own instance (exposed by its `store` property), so you can have many viewers in a page. Its state is entirely signal-based:

- `blocks`, `segments` (flat list), `positions` (by ID).
- `selectedIds`, `selectedSet`, `selectedSegments`, `caretId`.
- `find` (writable find options), `matches`, `hitSet`, `currentMatch`.

Its actions return `true` when they changed the selection: `setBlocks`, `startAt(id, extend)`, `extendTo(id)`, `moveCaret(dir, extend)`, `moveBlock(dir, extend)`, `moveToBlockEdge(edge, extend)`, `moveToTextEdge(edge, extend)`, `selectAll()`, `clear()`, `setSelectedIds(ids)`, and `goToMatch(dir)`.

As it has no dependencies, you can also use it outside of the viewer, e.g. to build a different UI.

### TextMeasureService

Measures the width of text in a given font (via an offscreen canvas, falling back to an estimate where no canvas is available), to size the SVG boxes. Measures are cached; when web fonts finish loading, the cache is cleared and its `version` signal is incremented, so that segments are re-measured.

### Pure Functions

- `resolveSegmentRange(segments, anchor, focus)`: the core selection rules (see [Selection](#selection)).
- `findTextSegments(blocks, options)`: the finder.
- `fillTipTemplate(template, segment)`, `resolveSegmentTip(segment, settings)`: tips.

## Writing a Segmenter

To write your own segmenter, implement `TextSegmenter<T>`:

1. `getBlocks`: split the text into blocks and segments. Assign unique IDs, set `selectionMode` for segments which must not start/end a selection (`wrapped`, `attached`) or must not be crossed (`blocked`), set labels for invisible values, and attach any metadata as `payload` (and colors, if you want to visualize it).
2. `getSegmentCoords`: map the selected segments to coordinates in your syntax, using the blocks for context. Return an empty string when there are no coordinates for them.
3. `getCoordsSegments`: parse coordinates and return the corresponding segments in text order, or `null` if they are invalid.

As the blocks of a text do not change while it is displayed, a segmenter can cache any index it builds from them (e.g. in a `WeakMap` keyed by the blocks array, as `SpacedTextSegmenter` does).

You can also post-process the segments returned by a segmenter, e.g. to set `selectionMode`, colors or CSS classes according to other data, as long as you create new segment objects rather than mutating them.

## SpacedTextSegmenter

A sample segmenter where:

- each character (code point) is a segment, including spaces. CR is ignored, and LF ends a block (and is included as the last segment of its block only if `includeLf` is true). Ignored characters still count for IDs and indexes.
- segment IDs are character ordinals (1-N); indexes are UTF-16 offsets in the source text, so that `text.substring(index, index + value.length) === value`.
- ASCII control characters get labels from the Unicode Control Pictures block (e.g. `␉` for TAB, `␊` for LF); space gets the `spaceLabel` (default `_`).
- whitespace characters are `wrapped`; Unicode combining characters are `wrapped` too, or `attached` if `combiningMode` is `attached`.
- an optional `payloadFactory(char, id, index)` builds the payload of each segment.

Its coordinates are token-based, a token being any sequence of non-whitespace characters, and optionally character-based within tokens. A point is `Y.X@AxR`:

- `Y`: block ordinal (1-N).
- `X`: token ordinal in the block (1-N).
- optionally, if not selecting whole tokens: `A` is the ordinal of the first character in the token (1-N), and `R` the count of characters (1-N; omitted when 1, so `1.2@3` is equal to `1.2@3x1`).

A selection within a single token has a single point. A selection spanning several tokens has a start and an end point, separated by `-`, both inclusive: the start point picks from its `A` to the end of its token, the end point picks from the start of its token to `A+R-1`. Whitespace between tokens is included, while whitespace at the edges of a selection is ignored.

For instance, with this text:

```txt
alpha beta
gamma
delta epsilon waw
zeta
```

- `2.1` = `gamma`.
- `1.2@2x2` = `et` (of `beta`).
- `3.1@4x2-3.2@1` = `ta e` (`ta` of `delta`, `e` of `epsilon`).
- `1.2@4-4.1@1x2` = `a gamma delta epsilon waw ze` (from the 4th character of `beta` to the first two of `zeta`).

## Theming

The components use only Angular Material M3 system tokens (`--mat-sys-*`), so they follow your theme, including dark mode. All the colors in settings are CSS colors, so you can use either tokens (`var(--mat-sys-...)`) or literal colors there. The caret outline color is also exposed as the CSS variable `--cadmus-tseg-caret-color` on the viewer's host.

## Performance

The viewer is designed for fluid updates with large texts:

- all the components are `OnPush` and signal-based, and zoneless-ready.
- segments are tracked by ID, and their selection, search and caret states are plain boolean inputs, so changing the selection re-renders only the segments whose state changed.
- pointer events are handled by a single set of listeners on the viewer (event delegation), not per segment.
- text widths are measured once per label and font, and cached.
- the tip popup is a single shared overlay.
- blocks out of the viewport skip layout and paint (`content-visibility: auto`).
- zoom uses CSS `zoom`, so it does not re-render segments.

## History

### 0.0.1

- 2026-11-13: initial release.
