import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TextSegment } from '@myrmidon/cadmus-text-segment';

/**
 * The payload attached to each segment in the demo.
 */
export interface UnicodePayload {
  code: string;
  category: string;
}

/**
 * A custom tip component for the segmented text view demo, showing the
 * Unicode code point and general category of a segment.
 */
@Component({
  selector: 'app-unicode-tip',
  template: `
    @if (segment()?.payload; as p) {
      <span class="code">{{ p.code }}</span>
      <span class="cat">{{ p.category }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      font-size: 10px;
      line-height: 14px;
      white-space: nowrap;
    }
    .code {
      font-family: 'Roboto Mono', Consolas, monospace;
    }
    .cat {
      padding: 0 3px;
      border-radius: 3px;
      background-color: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnicodeTipComponent {
  public readonly segment = input<TextSegment<UnicodePayload>>();
}
