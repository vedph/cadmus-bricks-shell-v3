import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import {
  DEFAULT_SEGMENTED_TEXT_SETTINGS,
  SegmentedTextSettings,
  TextSegment,
} from '../../models';
import { TextMeasureService } from '../../services/text-measure.service';
import { resolveSegmentTip } from '../../utils/tip-template';

/**
 * The vertical gap (px) between stacked boxes in a segment.
 */
const BOX_GAP = 2;

interface BoxGeometry {
  y: number;
  height: number;
}

/**
 * The geometry of a segment view.
 */
export interface TextSegmentGeometry {
  width: number;
  height: number;
  strokeWidth: number;
  radius: number;
  text: BoxGeometry;
  id?: BoxGeometry;
  index?: BoxGeometry;
  tip?: BoxGeometry;
}

/**
 * View of a single text segment: an SVG with a text box, optionally
 * followed by an ID box, an index box, and a tip box. This is a dumb
 * component, entirely driven by its inputs. Its host element carries the
 * segment ID in its `data-seg-id` attribute, which is used by the
 * containing views for event delegation.
 */
@Component({
  selector: 'cadmus-text-segment-view',
  imports: [NgComponentOutlet],
  templateUrl: './text-segment-view.html',
  styleUrl: './text-segment-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'option',
    '[attr.data-seg-id]': 'segment().id',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-label]': 'label()',
    '[class]': 'hostClass()',
  },
})
export class TextSegmentView {
  private readonly _measure = inject(TextMeasureService);

  /**
   * The segment to display.
   */
  public readonly segment = input.required<TextSegment<any>>();

  /**
   * The display settings.
   */
  public readonly settings = input<SegmentedTextSettings>(
    DEFAULT_SEGMENTED_TEXT_SETTINGS,
  );

  /**
   * True if the segment is selected.
   */
  public readonly selected = input<boolean>(false);

  /**
   * True if the segment is part of a search result.
   */
  public readonly hit = input<boolean>(false);

  /**
   * True if the segment has the caret.
   */
  public readonly caret = input<boolean>(false);

  public readonly label = computed(() => {
    const segment = this.segment();
    return segment.label ?? segment.value;
  });

  public readonly hostClass = computed(() => {
    const classes = ['cadmus-text-segment-view'];
    if (this.selected()) classes.push('selected');
    if (this.hit()) classes.push('hit');
    if (this.caret()) classes.push('caret');
    const mode = this.segment().selectionMode;
    if (mode && mode !== 'allowed') classes.push('mode-' + mode);
    const css = this.segment().cssClass;
    if (css) classes.push(css);
    return classes.join(' ');
  });

  /**
   * True if the tip box is displayed below the segment.
   */
  public readonly tipBelow = computed(() => {
    const s = this.settings();
    return !!s.showTipBox && s.tipPosition === 'below';
  });

  /**
   * The textual tip, when displayed below and not rendered by a component.
   */
  public readonly tipText = computed(() => {
    const s = this.settings();
    return this.tipBelow() && !s.tipComponent
      ? resolveSegmentTip(this.segment(), s)
      : '';
  });

  public readonly tipInputs = computed(() => ({ segment: this.segment() }));

  public readonly geometry = computed<TextSegmentGeometry>(() => {
    const s = this.settings();
    const segment = this.segment();
    // re-measure when fonts change
    this._measure.version();

    const strokeWidth = s.textRectStrokeWidth ?? 1;
    const padding = s.textRectPadding ?? 0;
    let width = Math.max(
      this._measure.measure(this.label(), s.fontFace, s.fontSize) + padding * 2,
      s.textRectMinWidth ?? 0,
    );
    const measureInfo = (text: string) =>
      this._measure.measure(text, s.infoFontFace, s.infoFontSize) + 4;
    if (s.showIdBox) {
      width = Math.max(width, measureInfo(String(segment.id)));
    }
    if (s.showIndexBox) {
      width = Math.max(width, measureInfo(String(segment.index)));
    }
    width = Math.ceil(width + strokeWidth);

    const g: TextSegmentGeometry = {
      width,
      height: s.textRectHeight,
      strokeWidth,
      radius: s.textRectRadius ?? 0,
      text: { y: 0, height: s.textRectHeight },
    };
    const stack = (height: number): BoxGeometry => {
      const box = { y: g.height + BOX_GAP, height };
      g.height = box.y + height;
      return box;
    };
    if (s.showIdBox) g.id = stack(s.infoRectHeight);
    if (s.showIndexBox) g.index = stack(s.infoRectHeight);
    if (this.tipBelow()) g.tip = stack(s.tipRectHeight);
    return g;
  });

  public readonly fill = computed(() => {
    const s = this.settings();
    if (this.selected()) return s.selectionColor;
    if (this.hit()) return s.resultColor;
    return this.segment().color ?? s.color;
  });

  public readonly textFill = computed(() => {
    const s = this.settings();
    if (this.selected()) return s.selectionTextColor;
    if (this.hit()) return s.resultTextColor;
    return this.segment().textColor ?? s.textColor;
  });

  public readonly stroke = computed(
    () => this.segment().borderColor ?? this.settings().borderColor,
  );
}
