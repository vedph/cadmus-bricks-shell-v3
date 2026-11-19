import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import {
  CdkConnectedOverlay,
  ConnectedPosition,
} from '@angular/cdk/overlay';

import { MatIconButton } from '@angular/material/button';
import {
  MatFormField,
  MatHint,
  MatPrefix,
  MatSuffix,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { MatTooltip } from '@angular/material/tooltip';

import {
  TEXT_SEGMENTER,
  TextSegment,
  TextSegmentBlock,
  TextSegmentClick,
  TextSegmentSelection,
  TextSegmenter,
  SegmentedTextSettings,
  resolveSegmentedTextSettings,
} from '../../models';
import { SegmentedTextStore } from '../../services/segmented-text-store';
import { resolveSegmentTip } from '../../utils/tip-template';
import { TextSegmentBlockView } from '../text-segment-block-view/text-segment-block-view';

/**
 * The debounce time (ms) for applying typed coordinates.
 */
export const SEGMENTED_TEXT_COORDS_DEBOUNCE = 400;

/** Minimum zoom factor. */
export const SEGMENTED_TEXT_MIN_ZOOM = 0.5;
/** Maximum zoom factor. */
export const SEGMENTED_TEXT_MAX_ZOOM = 3;

/**
 * The edge (px) of the viewport where dragging auto-scrolls it.
 */
const AUTO_SCROLL_EDGE = 24;

interface ViewControls {
  zoom: number;
  coords: string;
}

interface HoveredSegment<T> {
  element: Element;
  segment: TextSegment<T>;
}

function sameIds(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * View of a segmented text: its blocks stacked vertically in a scrollable
 * viewport, with a toolbar for zoom, find, and coordinates. Users select
 * segments like text in an editor: by clicking, dragging, SHIFT+clicking, or
 * with the keyboard (arrows, Home/End, CTRL+A, Escape), always within the
 * rules defined by each segment's selection mode. The selection is exposed
 * by the two-way `selectedIds` model, and each new selection made by the
 * user is emitted by `selectionChange`.
 */
@Component({
  selector: 'cadmus-segmented-text-view',
  imports: [
    CdkConnectedOverlay,
    FormField,
    MatFormField,
    MatHint,
    MatIcon,
    MatIconButton,
    MatInput,
    MatPrefix,
    MatSlider,
    MatSliderThumb,
    MatSuffix,
    MatTooltip,
    NgComponentOutlet,
    TextSegmentBlockView,
  ],
  providers: [SegmentedTextStore],
  templateUrl: './segmented-text-view.html',
  styleUrl: './segmented-text-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--cadmus-tseg-caret-color]': 'resolvedSettings().caretColor',
  },
})
export class SegmentedTextView<T = unknown> {
  private readonly _document = inject(DOCUMENT);
  private readonly _injectedSegmenter = inject<TextSegmenter<T>>(
    TEXT_SEGMENTER,
    { optional: true },
  );
  private _dragging = false;
  private _dragChanged = false;
  // the ID of the segment where the pointer was pressed, for clicks
  private _downId: number | null = null;
  private _lastCoords = '';

  /**
   * The state store of this view.
   */
  public readonly store = inject<SegmentedTextStore<T>>(SegmentedTextStore);

  // ── inputs and outputs ──────────────────────────────────────────────────

  /**
   * The blocks of segments to display.
   */
  public readonly blocks = input<readonly TextSegmentBlock<T>[]>([]);

  /**
   * The display settings. Any setting not specified here gets its default
   * value from `DEFAULT_SEGMENTED_TEXT_SETTINGS`.
   */
  public readonly settings = input<
    Partial<SegmentedTextSettings> | null | undefined
  >();

  /**
   * The segmenter used for coordinates. When not set, the one provided via
   * the `TEXT_SEGMENTER` token is used, if any. Without a segmenter, the
   * coordinates box is not displayed.
   */
  public readonly segmenter = input<TextSegmenter<T> | null | undefined>();

  /** True to show the zoom control. */
  public readonly showZoom = input<boolean>(true);
  /** True to show the find control. */
  public readonly showFind = input<boolean>(true);
  /** True to show the coordinates box (when a segmenter is available). */
  public readonly showCoords = input<boolean>(true);
  /** The accessible label of the text. */
  public readonly ariaLabel = input<string>('segmented text');

  /**
   * The IDs of the selected segments, in text order.
   */
  public readonly selectedIds = model<number[]>([]);

  /**
   * Emitted whenever the user makes a new selection.
   */
  public readonly selectionChange = output<TextSegmentSelection<T>>();

  /**
   * Emitted when the user clicks a segment (i.e. presses and releases the
   * primary pointer button on the same segment), whatever its selection
   * mode, including segments which cannot be selected like `blocked` ones.
   * This is emitted after any selection change caused by the click.
   */
  public readonly segmentClick = output<TextSegmentClick<T>>();

  // ── derived state ───────────────────────────────────────────────────────

  public readonly resolvedSettings = computed(() =>
    resolveSegmentedTextSettings(this.settings()),
  );

  public readonly activeSegmenter = computed<TextSegmenter<T> | null>(
    () => this.segmenter() ?? this._injectedSegmenter ?? null,
  );

  public readonly minZoom = SEGMENTED_TEXT_MIN_ZOOM;
  public readonly maxZoom = SEGMENTED_TEXT_MAX_ZOOM;

  private readonly _view = signal<ViewControls>({ zoom: 1, coords: '' });

  /**
   * The form for the view controls (zoom and coordinates).
   */
  public readonly viewForm = form(this._view);

  /**
   * The form for the find controls, bound to the store's find options.
   */
  public readonly findForm = form(this.store.find);

  /**
   * True when the typed coordinates are not valid.
   */
  public readonly coordsError = signal(false);

  public readonly viewport =
    viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly _overlay = viewChild(CdkConnectedOverlay);

  // ── tip popup ───────────────────────────────────────────────────────────

  public readonly hovered = signal<HoveredSegment<T> | null>(null);

  public readonly popupEnabled = computed(() => {
    const s = this.resolvedSettings();
    return !!s.showTipBox && s.tipPosition === 'popup';
  });

  public readonly popupText = computed(() => {
    const hovered = this.hovered();
    const s = this.resolvedSettings();
    return hovered && !s.tipComponent
      ? resolveSegmentTip(hovered.segment, s)
      : '';
  });

  public readonly popupOpen = computed(
    () =>
      this.popupEnabled() &&
      !!this.hovered() &&
      (!!this.resolvedSettings().tipComponent || !!this.popupText()),
  );

  public readonly popupInputs = computed(() => ({
    segment: this.hovered()?.segment,
  }));

  public readonly popupOrigin = computed<Element>(
    () => this.hovered()?.element ?? this.viewport().nativeElement,
  );

  public readonly popupPositions: ConnectedPosition[] = [
    {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
      offsetY: 6,
    },
    {
      originX: 'center',
      originY: 'top',
      overlayX: 'center',
      overlayY: 'bottom',
      offsetY: -6,
    },
  ];

  constructor() {
    // blocks -> store; a new segmenter just refreshes coordinates
    effect(() => {
      const blocks = this.blocks();
      this.activeSegmenter();
      untracked(() => {
        if (this.store.setBlocks(blocks)) {
          this.commit();
        } else {
          this.updateCoords();
        }
      });
    });

    // selectedIds model -> store (external changes only)
    effect(() => {
      const ids = this.selectedIds();
      untracked(() => {
        if (!sameIds(ids, this.store.selectedIds())) {
          this.store.setSelectedIds(ids);
          this.updateCoords();
        }
      });
    });

    // typed coordinates -> selection, debounced
    effect((onCleanup) => {
      const coords = this.viewForm.coords().value();
      if (coords === this._lastCoords) {
        return;
      }
      const handle = setTimeout(
        () => this.applyCoords(coords),
        SEGMENTED_TEXT_COORDS_DEBOUNCE,
      );
      onCleanup(() => clearTimeout(handle));
    });

    // the popup must not intercept pointer events, else hovering would
    // flicker as the pointer enters it
    effect(() => {
      if (this.popupOpen()) {
        untracked(() => this.disablePopupPointer());
      }
    });
  }

  // ── selection commit ────────────────────────────────────────────────────

  /**
   * Update the coordinates box from the current selection.
   * @returns The coordinates.
   */
  private updateCoords(): string {
    const segmenter = this.activeSegmenter();
    const coords =
      segmenter && this.store.selectedIds().length
        ? segmenter.getSegmentCoords(
            this.store.blocks(),
            this.store.selectedSegments(),
          )
        : '';
    this._lastCoords = coords;
    this.coordsError.set(false);
    this._view.update((v) => ({ ...v, coords }));
    return coords;
  }

  /**
   * Publish the store's selection to the model and to the selection event.
   * @param writeCoords False to leave the coordinates box untouched, e.g.
   * when the selection comes from it.
   */
  private commit(writeCoords = true): void {
    const ids = [...this.store.selectedIds()];
    this.selectedIds.set(ids);
    const segmenter = this.activeSegmenter();
    let coords: string;
    if (writeCoords) {
      coords = this.updateCoords();
    } else {
      coords =
        segmenter && ids.length
          ? segmenter.getSegmentCoords(
              this.store.blocks(),
              this.store.selectedSegments(),
            )
          : '';
    }
    this.selectionChange.emit({
      ids,
      segments: this.store.selectedSegments(),
      coords: coords || undefined,
    });
  }

  private applyCoords(coords: string): void {
    const segmenter = this.activeSegmenter();
    if (!segmenter) {
      return;
    }
    this._lastCoords = coords;
    const text = coords.trim();
    if (!text) {
      this.coordsError.set(false);
      if (this.store.clear()) {
        this.commit(false);
      }
      return;
    }
    const segments = segmenter.getCoordsSegments(this.store.blocks(), text);
    if (!segments) {
      this.coordsError.set(true);
      return;
    }
    this.coordsError.set(false);
    if (this.store.setSelectedIds(segments.map((s) => s.id))) {
      this.commit(false);
      if (segments.length) {
        this.scrollToSegment(segments[0].id);
      }
    }
  }

  // ── public API ──────────────────────────────────────────────────────────

  /**
   * Scroll the viewport so that the specified segment is visible.
   */
  public scrollToSegment(id: number): void {
    const el = this.viewport().nativeElement.querySelector(
      `[data-seg-id="${id}"]`,
    );
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Clear the selection.
   */
  public clearSelection(): void {
    if (this.store.clear()) {
      this.commit();
    }
  }

  /**
   * Go to the next or previous search match, selecting it.
   */
  public goToMatch(dir: 1 | -1): void {
    const ids = this.store.goToMatch(dir);
    if (ids) {
      this.commit();
      this.scrollToSegment(ids[0]);
    }
  }

  // ── toolbar ─────────────────────────────────────────────────────────────

  public formatZoom(value: number): string {
    return Math.round(value * 100) + '%';
  }

  public resetZoom(): void {
    this.viewForm.zoom().value.set(1);
  }

  public clearFind(): void {
    this.findForm.query().value.set('');
  }

  public toggleCrossSegments(): void {
    this.findForm.crossSegments().value.update((v) => !v);
  }

  public toggleCaseSensitive(): void {
    this.findForm.caseSensitive().value.update((v) => !v);
  }

  public onFindKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.goToMatch(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape' && this.findForm.query().value()) {
      event.preventDefault();
      event.stopPropagation();
      this.clearFind();
    }
  }

  // ── pointer ─────────────────────────────────────────────────────────────

  private segmentIdAt(target: EventTarget | null): number | null {
    const el = (target as Element | null)?.closest?.('[data-seg-id]');
    if (!el || !this.viewport().nativeElement.contains(el)) {
      return null;
    }
    const id = Number(el.getAttribute('data-seg-id'));
    return Number.isNaN(id) ? null : id;
  }

  private segmentById(id: number): TextSegment<T> | undefined {
    const pos = this.store.positions().get(id);
    return pos === undefined ? undefined : this.store.segments()[pos];
  }

  public onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    const id = this.segmentIdAt(event.target);
    if (id === null) {
      return;
    }
    // prevent native text selection and drag
    event.preventDefault();
    const viewport = this.viewport().nativeElement;
    viewport.focus({ preventScroll: true });
    this.hovered.set(null);
    this._dragging = true;
    this._downId = id;
    this._dragChanged = this.store.startAt(id, event.shiftKey);
    try {
      viewport.setPointerCapture?.(event.pointerId);
    } catch {
      // not supported: dragging works only within the viewport
    }
  }

  public onPointerMove(event: PointerEvent): void {
    if (!this._dragging) {
      return;
    }
    // with pointer capture the target is the viewport: find the segment
    // under the pointer
    const target =
      this._document.elementFromPoint?.(event.clientX, event.clientY) ??
      event.target;
    const id = this.segmentIdAt(target);
    if (id !== null && this.store.extendTo(id)) {
      this._dragChanged = true;
    }
    this.autoScroll(event.clientY);
  }

  public onPointerUp(event: PointerEvent): void {
    if (!this._dragging) {
      return;
    }
    this._dragging = false;
    try {
      this.viewport().nativeElement.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
    if (this._dragChanged) {
      this._dragChanged = false;
      this.commit();
    }

    // a click is a press and release on the same segment; with pointer
    // capture the target is the viewport, so find the segment under it
    const downId = this._downId;
    this._downId = null;
    if (downId === null || event.type === 'pointercancel') {
      return;
    }
    const target =
      this._document.elementFromPoint?.(event.clientX, event.clientY) ??
      event.target;
    if (this.segmentIdAt(target) === downId) {
      const segment = this.segmentById(downId);
      if (segment) {
        this.segmentClick.emit({ segment, event });
      }
    }
  }

  private autoScroll(clientY: number): void {
    const viewport = this.viewport().nativeElement;
    const rect = viewport.getBoundingClientRect();
    if (clientY < rect.top + AUTO_SCROLL_EDGE) {
      viewport.scrollTop -= rect.top + AUTO_SCROLL_EDGE - clientY;
    } else if (clientY > rect.bottom - AUTO_SCROLL_EDGE) {
      viewport.scrollTop += clientY - (rect.bottom - AUTO_SCROLL_EDGE);
    }
  }

  public onPointerOver(event: PointerEvent): void {
    if (this._dragging || !this.popupEnabled()) {
      return;
    }
    const el = (event.target as Element | null)?.closest?.('[data-seg-id]');
    const id = this.segmentIdAt(el ?? null);
    const segment = id === null ? undefined : this.segmentById(id);
    if (!el || !segment) {
      this.hovered.set(null);
    } else if (this.hovered()?.element !== el) {
      this.hovered.set({ element: el, segment });
    }
  }

  public onPointerLeave(): void {
    this.hovered.set(null);
  }

  private disablePopupPointer(): void {
    const ref = this._overlay()?.overlayRef;
    if (ref) {
      ref.overlayElement.style.pointerEvents = 'none';
      ref.hostElement.style.pointerEvents = 'none';
    }
  }

  public onPopupAttach(): void {
    this.disablePopupPointer();
  }

  // ── keyboard ────────────────────────────────────────────────────────────

  public onKeyDown(event: KeyboardEvent): void {
    const s = this.store;
    const extend = event.shiftKey;
    const ctrl = event.ctrlKey || event.metaKey;
    let changed = false;
    switch (event.key) {
      case 'ArrowLeft':
        changed = s.moveCaret(-1, extend);
        break;
      case 'ArrowRight':
        changed = s.moveCaret(1, extend);
        break;
      case 'ArrowUp':
        changed = s.moveBlock(-1, extend);
        break;
      case 'ArrowDown':
        changed = s.moveBlock(1, extend);
        break;
      case 'Home':
        changed = ctrl
          ? s.moveToTextEdge('start', extend)
          : s.moveToBlockEdge('start', extend);
        break;
      case 'End':
        changed = ctrl
          ? s.moveToTextEdge('end', extend)
          : s.moveToBlockEdge('end', extend);
        break;
      case 'a':
      case 'A':
        if (!ctrl) {
          return;
        }
        changed = s.selectAll();
        break;
      case 'Escape':
        // let Escape propagate (e.g. to close a dialog) when there is
        // nothing to clear
        if (!s.selectedIds().length) {
          return;
        }
        changed = s.clear();
        break;
      default:
        return;
    }
    event.preventDefault();
    if (changed) {
      this.commit();
      const caret = s.caretId();
      if (caret !== null) {
        this.scrollToSegment(caret);
      }
    }
  }

  public onWheel(event: WheelEvent): void {
    if (!event.ctrlKey || !this.showZoom()) {
      return;
    }
    event.preventDefault();
    const zoom = this.viewForm.zoom().value();
    const next = Math.round((zoom + (event.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10;
    this.viewForm
      .zoom()
      .value.set(Math.max(this.minZoom, Math.min(this.maxZoom, next)));
  }
}
