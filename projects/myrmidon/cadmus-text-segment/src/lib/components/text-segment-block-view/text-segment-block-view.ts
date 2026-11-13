import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  DEFAULT_SEGMENTED_TEXT_SETTINGS,
  SegmentedTextSettings,
  TextSegmentBlock,
} from '../../models';
import { TextSegmentView } from '../text-segment-view/text-segment-view';

const EMPTY_SET: ReadonlySet<number> = new Set<number>();

/**
 * View of a block of text segments: a row of segment views, reflowing to
 * the next line when reaching the container's end, optionally preceded by
 * the block number. This is a dumb component, entirely driven by its inputs.
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
}
