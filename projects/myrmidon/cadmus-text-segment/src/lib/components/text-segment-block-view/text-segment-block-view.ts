import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import {
  DEFAULT_SEGMENTED_TEXT_SETTINGS,
  SegmentedTextSettings,
  TextSegment,
  TextSegmentBlock,
} from '../../models';
import { TextSegmentView } from '../text-segment-view/text-segment-view';

const EMPTY_SET: ReadonlySet<number> = new Set<number>();
const WS_REGEX = /^\s+$/u;

/**
 * Split the specified segments into runs for `word` wrapping: each run ends
 * with a whitespace segment (i.e. a segment whose value is entirely
 * whitespace), except for the last one.
 */
export function getTextSegmentRuns<T>(
  segments: readonly TextSegment<T>[],
): TextSegment<T>[][] {
  const runs: TextSegment<T>[][] = [];
  let run: TextSegment<T>[] = [];
  for (const segment of segments) {
    run.push(segment);
    if (WS_REGEX.test(segment.value)) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) {
    runs.push(run);
  }
  return runs;
}

/**
 * View of a block of text segments: a row of segment views, reflowing to
 * the next line when reaching the container's end, optionally preceded by
 * the block number. According to the `wrapMode` setting, the row can wrap
 * after any segment, or only after whitespace segments, so that words stay
 * together. This is a dumb component, entirely driven by its inputs.
 */
@Component({
  selector: 'cadmus-text-segment-block-view',
  imports: [TextSegmentView],
  templateUrl: './text-segment-block-view.html',
  styleUrl: './text-segment-block-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '[attr.data-block-index]': 'block().index',
    '[attr.aria-label]': '"block " + (block().index + 1)',
  },
})
export class TextSegmentBlockView {
  /**
   * The block to display.
   */
  public readonly block = input.required<TextSegmentBlock<any>>();

  /**
   * The display settings.
   */
  public readonly settings = input<SegmentedTextSettings>(
    DEFAULT_SEGMENTED_TEXT_SETTINGS,
  );

  /**
   * The IDs of the selected segments.
   */
  public readonly selectedIds = input<ReadonlySet<number>>(EMPTY_SET);

  /**
   * The IDs of the segments in search results.
   */
  public readonly hitIds = input<ReadonlySet<number>>(EMPTY_SET);

  /**
   * The ID of the segment with the caret, if any.
   */
  public readonly caretId = input<number | null>(null);

  /**
   * The runs of segments kept together when wrapping by word, or null
   * when wrapping by segment.
   */
  public readonly runs = computed<TextSegment<any>[][] | null>(() =>
    this.settings().wrapMode === 'word'
      ? getTextSegmentRuns(this.block().segments)
      : null,
  );
}
