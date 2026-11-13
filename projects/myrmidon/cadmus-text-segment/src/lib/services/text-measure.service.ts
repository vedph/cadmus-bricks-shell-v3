import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/**
 * A service to measure the width of text rendered with a given font, used
 * to size the SVG boxes of segments. Measures are cached, and the cache is
 * cleared whenever web fonts finish loading: as `version` changes at that
 * time, computations reading it are re-evaluated to get the new measures.
 * When no canvas is available (e.g. server-side or in tests), widths are
 * estimated from the font size.
 */
@Injectable({ providedIn: 'root' })
export class TextMeasureService {
  private readonly _document = inject(DOCUMENT, { optional: true });
  private _context?: OffscreenCanvasRenderingContext2D | null;
  private readonly _cache = new Map<string, number>();
  private readonly _version = signal(0);

  /**
   * A version number incremented every time the cache is invalidated
   * because of a change in available fonts. Read it in a computation to
   * re-run it when measures change.
   */
  public readonly version = this._version.asReadonly();

  constructor() {
    const fonts = this._document?.fonts;
    if (fonts) {
      const invalidate = () => this.invalidate();
      if (fonts.status !== 'loaded') {
        fonts.ready?.then(invalidate).catch(() => undefined);
      }
      fonts.addEventListener?.('loadingdone', invalidate);
    }
  }

  private getContext(): OffscreenCanvasRenderingContext2D | null {
    if (this._context === undefined) {
      try {
        this._context =
          typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(1, 1).getContext('2d')
            : null;
      } catch {
        this._context = null;
      }
    }
    return this._context;
  }

  /**
   * Clear the cache of measures.
   */
  public invalidate(): void {
    this._cache.clear();
    this._version.update((v) => v + 1);
  }

  /**
   * Estimate the width of a text from a CSS font size, used when measuring
   * is not possible.
   */
  public static estimate(text: string, fontSize: string): number {
    const m = /([\d.]+)\s*(px|pt|r?em)?/.exec(fontSize);
    let px = m ? parseFloat(m[1]) : 16;
    switch (m?.[2]) {
      case 'pt':
        px = (px * 4) / 3;
        break;
      case 'em':
      case 'rem':
        px *= 16;
        break;
    }
    return [...text].length * px * 0.6;
  }

  /**
   * Measure the width in pixels of the specified text.
   * @param text The text to measure.
   * @param fontFace The CSS font family.
   * @param fontSize The CSS font size.
   * @returns The width.
   */
  public measure(text: string, fontFace: string, fontSize: string): number {
    if (!text) {
      return 0;
    }
    const font = `${fontSize} ${fontFace}`;
    const key = font + '\u0000' + text;
    let width = this._cache.get(key);
    if (width === undefined) {
      const ctx = this.getContext();
      if (ctx) {
        ctx.font = font;
        width = ctx.measureText(text).width;
      } else {
        width = TextMeasureService.estimate(text, fontSize);
      }
      this._cache.set(key, width);
    }
    return width;
  }
}
