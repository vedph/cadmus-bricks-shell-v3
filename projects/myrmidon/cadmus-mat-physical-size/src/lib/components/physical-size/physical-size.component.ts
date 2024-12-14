import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { Subscription } from 'rxjs';

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
})
export class PhysicalSizeComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _updating?: boolean;

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
  public readonly noTag = input<boolean>();

  /**
   * Emitted when the size changes.
   */
  public readonly sizeChange = output<PhysicalSize>();

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

  public label?: string;

  constructor(formBuilder: FormBuilder) {
    this.tag = formBuilder.control(null, Validators.maxLength(50));

    this.wValue = formBuilder.control(0, { nonNullable: true });
    this.wUnit = formBuilder.control('cm', { nonNullable: true });
    this.wTag = formBuilder.control(null, Validators.maxLength(50));

    this.hValue = formBuilder.control(0, { nonNullable: true });
    this.hUnit = formBuilder.control('cm', { nonNullable: true });
    this.hTag = formBuilder.control(null, Validators.maxLength(50));

    this.dValue = formBuilder.control(0, { nonNullable: true });
    this.dUnit = formBuilder.control('cm', { nonNullable: true });
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
      this.updateForm(this.size());
    });

    // when defaultWUnit changes, update control
    effect(() => {
      if (!this.wValue.value) {
        this.wUnit.setValue(this.defaultWUnit());
      }
    });

    // when defaultHUnit changes, update control
    effect(() => {
      if (!this.hValue.value) {
        this.hUnit.setValue(this.defaultHUnit());
      }
    });

    // when defaultDUnit changes, update control
    effect(() => {
      if (!this.dValue.value) {
        this.dUnit.setValue(this.defaultDUnit());
      }
    });

    // when hBeforeW changes, update text
    effect(() => {
      this.text.setValue(
        PhysicalSizeParser.toString(this.size(), this.hBeforeW())
      );
    });
  }

  public ngOnInit(): void {
    this._sub = this.form.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(400))
      .subscribe((_) => {
        if (this._updating) {
          this._updating = false;
          return;
        }
        this.size.set(this.getSize());

        if (
          this.isModelValid(this.size()) &&
          this.tag.valid &&
          this.note.valid
        ) {
          this.updateLabel();
          this.sizeChange.emit(this.size()!);
          this.text.setValue(
            PhysicalSizeParser.toString(this.size()!, this.hBeforeW())
          );
        }
      });

    // this.updateForm(this.size());
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
    const size = PhysicalSizeParser.parse(this.text.value, this.hBeforeW());
    if (size) {
      this.updateForm(size);
      this.size.set(size);
      this.sizeChange.emit(this.size()!);
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

  private updateLabel(): void {
    const sb: string[] = [];

    // determine the unique unit if any
    let uniqueUnit: string | undefined = undefined;
    if (this.wValue.value) {
      uniqueUnit = this.wUnit.value;
    }

    if (this.hValue.value) {
      if (!uniqueUnit) {
        uniqueUnit = this.hUnit.value;
      } else if (uniqueUnit !== this.hUnit.value) {
        uniqueUnit = undefined;
      }
    }

    if (this.dValue.value) {
      if (!uniqueUnit) {
        uniqueUnit = this.dUnit.value;
      } else if (uniqueUnit !== this.dUnit.value) {
        uniqueUnit = undefined;
      }
    }

    if (this.hBeforeW()) {
      if (this.hValue.value) {
        sb.push(
          this.getDimensionLabel(
            this.hValue.value,
            uniqueUnit ? null : this.hUnit.value
          )
        );
      }
      if (this.wValue.value) {
        sb.push(
          this.getDimensionLabel(
            this.wValue.value,
            uniqueUnit ? null : this.wUnit.value
          )
        );
      }
    } else {
      if (this.wValue.value) {
        sb.push(
          this.getDimensionLabel(
            this.wValue.value,
            uniqueUnit ? null : this.wUnit.value
          )
        );
      }
      if (this.hValue.value) {
        sb.push(
          this.getDimensionLabel(
            this.hValue.value,
            uniqueUnit ? null : this.hUnit.value
          )
        );
      }
    }
    if (this.dValue.value) {
      sb.push(
        this.getDimensionLabel(
          this.dValue.value,
          uniqueUnit ? null : this.dUnit.value
        )
      );
    }

    this.label = sb.join(' × ') + (uniqueUnit ? ' ' + uniqueUnit : '');
  }

  private resetUnits(): void {
    this.wUnit.setValue(this.defaultWUnit());
    this.hUnit.setValue(this.defaultHUnit());
    this.dUnit.setValue(this.defaultDUnit());
  }

  private updateForm(model?: PhysicalSize | null): void {
    this._updating = true;

    if (!model) {
      this.form.reset();
      this.resetUnits();
      this.label = undefined;
    } else {
      this.tag.setValue(model.tag || null);
      this.note.setValue(model.note || null);

      if (model.w?.value) {
        this.wValue.setValue(model.w.value);
        this.wUnit.setValue(model.w.unit);
        this.wTag.setValue(model.w.tag || null);
      } else {
        this.wValue.reset();
        this.wUnit.setValue(this.defaultWUnit());
        this.wTag.reset();
      }

      if (model.h?.value) {
        this.hValue.setValue(model.h.value);
        this.hUnit.setValue(model.h.unit);
        this.hTag.setValue(model.h.tag || null);
      } else {
        this.hValue.reset();
        this.hUnit.setValue(this.defaultHUnit());
        this.hTag.reset();
      }

      if (model.d?.value) {
        this.dValue.setValue(model.d.value);
        this.dUnit.setValue(model.d.unit);
        this.dTag.setValue(model.d.tag || null);
      } else {
        this.dValue.reset();
        this.dUnit.setValue(this.defaultDUnit());
        this.dTag.reset();
      }

      this.form.markAsPristine();
      this.updateLabel();
    }

    // this._updating = false;
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
