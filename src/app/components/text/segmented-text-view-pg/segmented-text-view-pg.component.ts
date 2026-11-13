import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  SegmentedTextSettings,
  SegmentedTextView,
  SpacedTextSegmenter,
  TextSegmentBlock,
  TextSegmentSelection,
} from '@myrmidon/cadmus-text-segment';

import { UnicodePayload, UnicodeTipComponent } from './unicode-tip.component';

const SAMPLE_TEXT =
  'alpha beta\ngamma\ndelta epsilon waw\nzeta\n' +
  'Arma virumque cano, Troiae qui primus ab oris | Italiam fato profugus ' +
  'Laviniaque venit litora.\n' +
  'Café au lait, 2024\tend.';

const CATEGORIES: [RegExp, string][] = [
  [/\p{Lu}/u, 'Lu'],
  [/\p{Ll}/u, 'Ll'],
  [/\p{Lt}/u, 'Lt'],
  [/\p{Lm}/u, 'Lm'],
  [/\p{Lo}/u, 'Lo'],
  [/\p{Mn}/u, 'Mn'],
  [/\p{Mc}/u, 'Mc'],
  [/\p{Me}/u, 'Me'],
  [/\p{Nd}/u, 'Nd'],
  [/\p{N}/u, 'N'],
  [/\p{P}/u, 'P'],
  [/\p{S}/u, 'S'],
  [/\p{Zs}/u, 'Zs'],
  [/\p{Cc}/u, 'Cc'],
];

function getUnicodePayload(char: string): UnicodePayload {
  const cp = char.codePointAt(0) ?? 0;
  return {
    code: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
    category: CATEGORIES.find(([r]) => r.test(char))?.[1] ?? '?',
  };
}

interface DemoOptions {
  text: string;
  includeLf: boolean;
  attachCombining: boolean;
  blockPipes: boolean;
  decorate: boolean;
  showBlockNumbers: boolean;
  showIdBox: boolean;
  showIndexBox: boolean;
  showTipBox: boolean;
  tipPosition: 'below' | 'popup';
  tipMode: 'template' | 'component';
}

@Component({
  selector: 'app-segmented-text-view-pg',
  imports: [
    FormField,
    JsonPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    SegmentedTextView,
  ],
  templateUrl: './segmented-text-view-pg.component.html',
  styleUrl: './segmented-text-view-pg.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedTextViewPgComponent {
  private readonly _options = signal<DemoOptions>({
    text: SAMPLE_TEXT,
    includeLf: false,
    attachCombining: true,
    blockPipes: true,
    decorate: true,
    showBlockNumbers: true,
    showIdBox: false,
    showIndexBox: false,
    showTipBox: true,
    tipPosition: 'popup',
    tipMode: 'template',
  });

  public readonly form = form(this._options);

  /**
   * The text actually segmented: it follows the typed text with a short
   * debounce, so that typing stays fluid.
   */
  public readonly text = signal(SAMPLE_TEXT);

  // fine-grained option signals: as each computed notifies only when its
  // value changes, typing in the text box does not rebuild blocks/settings
  private readonly _includeLf = computed(() => this._options().includeLf);
  private readonly _attachCombining = computed(
    () => this._options().attachCombining,
  );
  private readonly _blockPipes = computed(() => this._options().blockPipes);
  private readonly _decorate = computed(() => this._options().decorate);
  private readonly _display = computed(
    () => {
      const o = this._options();
      return {
        showBlockNumbers: o.showBlockNumbers,
        showIdBox: o.showIdBox,
        showIndexBox: o.showIndexBox,
        showTipBox: o.showTipBox,
        tipPosition: o.tipPosition,
        tipMode: o.tipMode,
      };
    },
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );

  public readonly segmenter = computed(
    () =>
      new SpacedTextSegmenter<UnicodePayload>({
        includeLf: this._includeLf(),
        combiningMode: this._attachCombining() ? 'attached' : 'wrapped',
        payloadFactory: getUnicodePayload,
      }),
  );

  public readonly blocks = computed<TextSegmentBlock<UnicodePayload>[]>(() => {
    const o = { blockPipes: this._blockPipes(), decorate: this._decorate() };
    const blocks = this.segmenter().getBlocks(this.text());
    if (!o.blockPipes && !o.decorate) {
      return blocks;
    }
    // post-process segments to show consumer-side metadata
    for (const block of blocks) {
      block.segments = block.segments.map((s) => {
        if (o.blockPipes && s.value === '|') {
          return { ...s, selectionMode: 'blocked' };
        }
        if (o.decorate) {
          const cat = s.payload?.category;
          if (cat === 'Lu') {
            return { ...s, borderColor: 'var(--mat-sys-tertiary)' };
          }
          if (cat === 'Nd') {
            return {
              ...s,
              color: 'var(--mat-sys-secondary-container)',
              textColor: 'var(--mat-sys-on-secondary-container)',
            };
          }
          if (cat === 'P') {
            return { ...s, textColor: 'var(--mat-sys-error)' };
          }
        }
        return s;
      });
    }
    return blocks;
  });

  public readonly settings = computed<Partial<SegmentedTextSettings>>(() => {
    const o = this._display();
    return {
      showBlockNumbers: o.showBlockNumbers,
      showIdBox: o.showIdBox,
      showIndexBox: o.showIndexBox,
      showTipBox: o.showTipBox,
      tipPosition: o.tipPosition,
      tipTemplate: '{{code}} {{category}}',
      tipComponent: o.tipMode === 'component' ? UnicodeTipComponent : undefined,
      tipRectHeight: o.tipMode === 'component' ? 16 : 14,
    };
  });

  public readonly selectedIds = signal<number[]>([]);
  public readonly selection = signal<TextSegmentSelection<UnicodePayload> | null>(
    null,
  );
  public readonly showJson = signal(false);

  public readonly selectedText = computed(
    () => this.selection()?.segments.map((s) => s.value).join('') ?? '',
  );

  constructor() {
    effect((onCleanup) => {
      const text = this.form.text().value();
      const handle = setTimeout(() => this.text.set(text), 300);
      onCleanup(() => clearTimeout(handle));
    });
  }

  public resetText(): void {
    this.form.text().value.set(SAMPLE_TEXT);
  }

  public selectSample(): void {
    // "beta" + "gamma" via the bound model
    this.selectedIds.set([7, 8, 9, 10, 12, 13, 14, 15, 16]);
  }

  public onSelectionChange(
    selection: TextSegmentSelection<UnicodePayload>,
  ): void {
    this.selection.set(selection);
  }
}
