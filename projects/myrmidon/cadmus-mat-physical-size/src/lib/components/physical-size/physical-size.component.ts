import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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

@Component({
  selector: 'cadmus-mat-physical-size',
  templateUrl: './physical-size.component.html',
  styleUrls: ['./physical-size.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
export class PhysicalSizeComponent implements OnInit, OnDestroy {
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

  public form: FormGroup;
  public tag: FormControl<string | null>;
  public wValue: FormControl<number>;
  public wUnit: FormControl<string>;
  public wTag: FormControl<string | null>;
  public hValue: FormControl<number>;
  public hUnit: FormControl<string>;
  public hTag: FormControl<string | null>;
  public dValue: FormControl<number>;
  public dUnit: FormControl<string>;
  public dTag: FormControl<string | null>;
  public note: FormControl<string | null>;

  public text: FormControl<string | null>;

  public readonly visualExpanded = signal<boolean>(false);

  // trick to force label refresh on form changes
  private readonly formChanged = signal(0);

  public readonly label = computed(() => {
    // read the signal to make this computed depend on it
    this.formChanged();

    const wValue = this.wValue.value;
    const hValue = this.hValue.value;
    const dValue = this.dValue.value;
    const wUnit = this.wUnit.value;
    const hUnit = this.hUnit.value;
    const dUnit = this.dUnit.value;
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

  constructor(formBuilder: FormBuilder) {
    this.tag = formBuilder.control(null, Validators.maxLength(50));

    this.wValue = formBuilder.control(0, { nonNullable: true });
    this.wUnit = formBuilder.control(this.defaultWUnit(), {
      nonNullable: true,
    });
    this.wTag = formBuilder.control(null, Validators.maxLength(50));

    this.hValue = formBuilder.control(0, { nonNullable: true });
    this.hUnit = formBuilder.control(this.defaultHUnit(), {
      nonNullable: true,
    });
    this.hTag = formBuilder.control(null, Validators.maxLength(50));

    this.dValue = formBuilder.control(0, { nonNullable: true });
    this.dUnit = formBuilder.control(this.defaultDUnit(), {
      nonNullable: true,
    });
    this.dTag = formBuilder.control(null, Validators.maxLength(50));

    this.note = formBuilder.control(null, Validators.maxLength(100));

    this.form = formBuilder.group(
      {
        tag: this.tag,
        wValue: this.wValue,
        wUnit: this.wUnit,
        wTag: this.wTag,
        hValue: this.hValue,
        hUnit: this.hUnit,
        hTag: this.hTag,
        dValue: this.dValue,
        dUnit: this.dUnit,
        dTag: this.dTag,
        note: this.note,
      },
      {
        validators: this.validateUnit,
      }
    );

    this.text = formBuilder.control(null, {
      validators: Validators.maxLength(1000),
    });

    // when size changes, update form
    effect(() => {
      const size = this.size();
      console.log('size', size);
      this.updateForm(size);
    });

    // when defaultWUnit changes, update control
    effect(() => {
      this.wUnit.setValue(this.defaultWUnit());
    });

    // when defaultHUnit changes, update control
    effect(() => {
      this.hUnit.setValue(this.defaultHUnit());
    });

    // when defaultDUnit changes, update control
    effect(() => {
      this.dUnit.setValue(this.defaultDUnit());
    });

    // when hBeforeW changes, update text
    effect(() => {
      setTimeout(() => {
        this.text.setValue(
          PhysicalSizeParser.toString(this.size(), this.hBeforeW()),
          { emitEvent: false }
        );
      }, 0);
    });
  }

  public ngOnInit(): void {
    this._sub = this.form.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(400))
      .subscribe((_) => {
        this.size.set(this.getSize());
        // notify the label computed to update
        this.formChanged.update((v) => v + 1);
        if (
          this.isModelValid(this.size()) &&
          this.tag.valid &&
          this.note.valid
        ) {
          // this.updateLabel();
          // update text
          setTimeout(() => {
            this.text.setValue(
              PhysicalSizeParser.toString(this.size()!, this.hBeforeW()),
              { emitEvent: false }
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
    if (!this.text.value) {
      return;
    }
    const size = PhysicalSizeParser.parse(
      this.text.value,
      this.hBeforeW(),
      this.hBeforeW() ? this.defaultHUnit() : this.defaultWUnit()
    );
    if (size) {
      this.updateForm(size);
      this.size.set(size);
      // manually trigger label update since updateForm uses emitEvent: false
      this.formChanged.update((v) => v + 1);
    }
  }

  private validateUnit(form: FormGroup): { [key: string]: any } | null {
    const w = form.get('wValue')?.value || 0;
    const h = form.get('hValue')?.value || 0;
    const d = form.get('dValue')?.value || 0;

    if (w && !form.get('wUnit')?.value) {
      return {
        unit: true,
      };
    }
    if (h && !form.get('hUnit')?.value) {
      return {
        unit: true,
      };
    }
    if (d && !form.get('dUnit')?.value) {
      return {
        unit: true,
      };
    }

    return null;
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

  private resetUnits(): void {
    this.wUnit.setValue(this.defaultWUnit(), { emitEvent: false });
    this.hUnit.setValue(this.defaultHUnit(), { emitEvent: false });
    this.dUnit.setValue(this.defaultDUnit(), { emitEvent: false });
  }

  private updateForm(model?: PhysicalSize | null): void {
    if (!model) {
      this.form.reset({ emitEvent: false });
      this.resetUnits();
      // this.label.set(undefined);
    } else {
      this.tag.setValue(model.tag || null, { emitEvent: false });
      this.note.setValue(model.note || null, { emitEvent: false });

      if (model.w?.value) {
        this.wValue.setValue(model.w.value, { emitEvent: false });
        this.wUnit.setValue(model.w.unit, { emitEvent: false });
        this.wTag.setValue(model.w.tag || null, { emitEvent: false });
      } else {
        this.wValue.reset(undefined, { emitEvent: false });
        this.wUnit.setValue(this.defaultWUnit(), { emitEvent: false });
        this.wTag.reset(undefined, { emitEvent: false });
      }

      if (model.h?.value) {
        this.hValue.setValue(model.h.value, { emitEvent: false });
        this.hUnit.setValue(model.h.unit, { emitEvent: false });
        this.hTag.setValue(model.h.tag || null, { emitEvent: false });
      } else {
        this.hValue.reset(undefined, { emitEvent: false });
        this.hUnit.setValue(this.defaultHUnit(), { emitEvent: false });
        this.hTag.reset(undefined, { emitEvent: false });
      }

      if (model.d?.value) {
        this.dValue.setValue(model.d.value, { emitEvent: false });
        this.dUnit.setValue(model.d.unit, { emitEvent: false });
        this.dTag.setValue(model.d.tag || null, { emitEvent: false });
      } else {
        this.dValue.reset(undefined, { emitEvent: false });
        this.dUnit.setValue(this.defaultDUnit(), { emitEvent: false });
        this.dTag.reset(undefined, { emitEvent: false });
      }

      this.form.markAsPristine();
      // this.updateLabel();
    }
  }

  private getDimension(
    v: FormControl,
    u: FormControl,
    t: FormControl
  ): PhysicalDimension {
    return {
      value: v.value || 0,
      unit: u.value,
      tag: t.value?.trim(),
    };
  }

  private getSize(): PhysicalSize {
    return {
      tag: this.tag.value?.trim(),
      note: this.note.value?.trim(),
      w: this.wValue.value
        ? this.getDimension(this.wValue, this.wUnit, this.wTag)
        : undefined,
      h: this.hValue.value
        ? this.getDimension(this.hValue, this.hUnit, this.hTag)
        : undefined,
      d: this.dValue.value
        ? this.getDimension(this.dValue, this.dUnit, this.dTag)
        : undefined,
    };
  }
}
