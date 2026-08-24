import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  FormField,
  form,
  maxLength,
  min,
  validateTree,
} from '@angular/forms/signals';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { PhysicalDimension } from '../physical-dimension/physical-dimension.component';
import { PhysicalSizeParser } from './physical-size-parser';

/**
 * A physical 1D, 2D or 3D size.
 */
export interface PhysicalSize {
  tag?: string;
  w?: PhysicalDimension;
  h?: PhysicalDimension;
  d?: PhysicalDimension;
  note?: string;
}

/**
 * The editable controls backing the visual size editor.
 */
interface PhysicalSizeControls {
  tag: string;
  wValue: number;
  wUnit: string;
  wTag: string;
  hValue: number;
  hUnit: string;
  hTag: string;
  dValue: number;
  dUnit: string;
  dTag: string;
  note: string;
}

@Component({
  selector: 'cadmus-mat-physical-size',
  templateUrl: './physical-size.component.html',
  styleUrls: ['./physical-size.component.css'],
  imports: [
    CommonModule,
    FormField,
    // material
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalSizeComponent implements OnDestroy {
  private _sub?: Subscription;

  /**
   * The size to edit.
   */
  public readonly size = model<PhysicalSize>();

  /**
   * The default unit for width.
   */
  public readonly defaultWUnit = input<string>('cm');

  /**
   * The default unit for height.
   */
  public readonly defaultHUnit = input<string>('cm');

  /**
   * The default unit for depth.
   */
  public readonly defaultDUnit = input<string>('cm');

  // physical-size-units
  public readonly unitEntries = input<ThesaurusEntry[]>();

  // physical-size-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  // physical-size-dim-tags
  public readonly dimTagEntries = input<ThesaurusEntry[]>();

  /**
   * True if the height comes before the width in the text representation.
   */
  public readonly hBeforeW = input<boolean>(false);

  /**
   * True to hide the tag.
   */
  public readonly hideTag = input<boolean>();

  /**
   * The editable draft, derived from `size` but writable in place.
   * `previous` tells an external change apart from the echo of our own
   * save: when the incoming size is just what the current draft maps to,
   * the draft is already up to date and keeping it preserves in-progress
   * edits that the mapping normalizes away.
   */
  private readonly _draft = linkedSignal<
    PhysicalSize | undefined,
    PhysicalSizeControls
  >({
    source: () => this.size(),
    computation: (size, previous) =>
      previous && this.sizesEqual(this.getSize(previous.value), size)
        ? previous.value
        : this.toControls(size),
  });

  public readonly form: FieldTree<PhysicalSizeControls>;

  private readonly _text = signal({ text: '' });
  public readonly textForm: FieldTree<{ text: string }>;

  public readonly visualExpanded = signal<boolean>(false);

  public readonly label = computed(() => {
    const wValue = this.form.wValue().value();
    const hValue = this.form.hValue().value();
    const dValue = this.form.dValue().value();
    const wUnit = this.form.wUnit().value();
    const hUnit = this.form.hUnit().value();
    const dUnit = this.form.dUnit().value();
    const hBeforeW = this.hBeforeW();

    // determine the unique unit if any
    let uniqueUnit: string | undefined = undefined;
    if (wValue) uniqueUnit = wUnit;
    if (hValue)
      uniqueUnit = uniqueUnit
        ? uniqueUnit === hUnit
          ? uniqueUnit
          : undefined
        : hUnit;
    if (dValue)
      uniqueUnit = uniqueUnit
        ? uniqueUnit === dUnit
          ? uniqueUnit
          : undefined
        : dUnit;

    const getDimensionLabel = (value: number, unit?: string | null): string => {
      if (!value) return '';
      let s = value.toFixed(2);
      if (unit) s += ' ' + unit;
      return s;
    };

    const sb: string[] = [];
    if (hBeforeW) {
      if (hValue) sb.push(getDimensionLabel(hValue, uniqueUnit ? null : hUnit));
      if (wValue) sb.push(getDimensionLabel(wValue, uniqueUnit ? null : wUnit));
    } else {
      if (wValue) sb.push(getDimensionLabel(wValue, uniqueUnit ? null : wUnit));
      if (hValue) sb.push(getDimensionLabel(hValue, uniqueUnit ? null : hUnit));
    }
    if (dValue) sb.push(getDimensionLabel(dValue, uniqueUnit ? null : dUnit));

    return sb.join(' × ') + (uniqueUnit ? ' ' + uniqueUnit : '');
  });

  constructor() {
    this.form = form(this._draft, (path) => {
      maxLength(path.tag, 50);
      maxLength(path.wTag, 50);
      maxLength(path.hTag, 50);
      maxLength(path.dTag, 50);
      maxLength(path.note, 100);
      min(path.wValue, 0);
      min(path.hValue, 0);
      min(path.dValue, 0);

      // at least one of w/h/d has a value without a matching unit
      validateTree(path, (ctx) => {
        const w = ctx.valueOf(path.wValue) || 0;
        const h = ctx.valueOf(path.hValue) || 0;
        const d = ctx.valueOf(path.dValue) || 0;

        if (w && !ctx.valueOf(path.wUnit)) {
          return { kind: 'unit' };
        }
        if (h && !ctx.valueOf(path.hUnit)) {
          return { kind: 'unit' };
        }
        if (d && !ctx.valueOf(path.dUnit)) {
          return { kind: 'unit' };
        }
        return null;
      });
    });

    this.textForm = form(this._text, (path) => {
      maxLength(path.text, 1000);
    });

    // the draft mirrors the bound size again: no unsaved edits, so clear
    // the interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (
          JSON.stringify(draft) === JSON.stringify(this.toControls(this.size()))
        ) {
          this.form().reset();
        }
      });
    });

    // when hBeforeW changes, update text
    effect(() => {
      setTimeout(() => {
        this.textForm.text().value.set(
          PhysicalSizeParser.toString(this.size(), this.hBeforeW()) || ''
        );
      }, 0);
    });

    // debounced form -> model sync
    this._sub = toObservable(this._draft)
      .pipe(distinctUntilChanged(), debounceTime(400))
      .subscribe(() => {
        const newSize = this.getSize();
        if (this.sizesEqual(newSize, this.size())) {
          return;
        }
        this.size.set(newSize);
        if (
          this.isModelValid(newSize) &&
          this.form.tag().valid() &&
          this.form.note().valid()
        ) {
          setTimeout(() => {
            this.textForm.text().value.set(
              PhysicalSizeParser.toString(newSize, this.hBeforeW()) || ''
            );
          }, 0);
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public parseText(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const text = this.textForm.text().value();
    if (!text) {
      return;
    }
    const size = PhysicalSizeParser.parse(
      text,
      this.hBeforeW(),
      this.hBeforeW() ? this.defaultHUnit() : this.defaultWUnit()
    );
    if (size) {
      this.size.set(size);
    }
  }

  private makeDefaultControls(): PhysicalSizeControls {
    return {
      tag: '',
      wValue: 0,
      wUnit: this.defaultWUnit(),
      wTag: '',
      hValue: 0,
      hUnit: this.defaultHUnit(),
      hTag: '',
      dValue: 0,
      dUnit: this.defaultDUnit(),
      dTag: '',
      note: '',
    };
  }

  private dimensionsEqual(a?: PhysicalDimension, b?: PhysicalDimension): boolean {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return a.value === b.value && a.unit === b.unit && a.tag === b.tag;
  }

  private sizesEqual(a?: PhysicalSize, b?: PhysicalSize): boolean {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return (
      a.tag === b.tag &&
      a.note === b.note &&
      this.dimensionsEqual(a.w, b.w) &&
      this.dimensionsEqual(a.h, b.h) &&
      this.dimensionsEqual(a.d, b.d)
    );
  }

  private getDimensionLabel(value: number, unit?: string | null): string {
    if (!value) {
      return '';
    }
    let s = value.toFixed(2);
    if (unit) {
      s += ' ' + unit;
    }
    return s;
  }

  private isModelValid(model?: PhysicalSize): boolean {
    if (!model) {
      return false;
    }
    return (
      // at least 1 dim with unit
      ((model.w?.value && !!model.w.unit) ||
        (model.h?.value && !!model.h.unit) ||
        (model.d?.value && !!model.d.unit)) &&
        // no dim without unit
        !(model.w?.value && !model.w.unit) &&
        !(model.h?.value && !model.h.unit) &&
        !(model.d?.value && !model.d.unit)
        ? true
        : false
    );
  }

  /** Map a bound size to the editable draft shape. */
  private toControls(size?: PhysicalSize | null): PhysicalSizeControls {
    return !size
      ? this.makeDefaultControls()
      : {
        tag: size.tag || '',
        wValue: size.w?.value || 0,
        wUnit: size.w?.value
          ? size.w.unit || this.defaultWUnit()
          : this.defaultWUnit(),
        wTag: (size.w?.value ? size.w.tag : undefined) || '',
        hValue: size.h?.value || 0,
        hUnit: size.h?.value
          ? size.h.unit || this.defaultHUnit()
          : this.defaultHUnit(),
        hTag: (size.h?.value ? size.h.tag : undefined) || '',
        dValue: size.d?.value || 0,
        dUnit: size.d?.value
          ? size.d.unit || this.defaultDUnit()
          : this.defaultDUnit(),
        dTag: (size.d?.value ? size.d.tag : undefined) || '',
        note: size.note || '',
      };
  }

  private getDimension(value: number, unit: string, tag: string): PhysicalDimension {
    return {
      value: value || 0,
      unit,
      tag: tag.trim() || undefined,
    };
  }

  private getSize(draft: PhysicalSizeControls = this._draft()): PhysicalSize {
    const v = draft;
    return {
      tag: v.tag.trim() || undefined,
      note: v.note.trim() || undefined,
      w: v.wValue ? this.getDimension(v.wValue, v.wUnit, v.wTag) : undefined,
      h: v.hValue ? this.getDimension(v.hValue, v.hUnit, v.hTag) : undefined,
      d: v.dValue ? this.getDimension(v.dValue, v.dUnit, v.dTag) : undefined,
    };
  }
}
