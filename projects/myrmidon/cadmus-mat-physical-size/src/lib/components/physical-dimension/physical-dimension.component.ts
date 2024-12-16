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
import { debounceTime } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Subscription } from 'rxjs';

/**
 * A physical dimension value.
 */
export interface PhysicalDimension {
  tag?: string;
  value: number;
  unit: string;
}

@Component({
  selector: 'cadmus-physical-dimension',
  templateUrl: './physical-dimension.component.html',
  styleUrls: ['./physical-dimension.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
})
export class PhysicalDimensionComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _changeFrozen?: boolean;

  public readonly label = input<string>();

  // physical-size-units
  public readonly unitEntries = input<ThesaurusEntry[]>([
    { id: 'cm', value: 'cm' },
    { id: 'mm', value: 'mm' },
  ]);

  // physical-size-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * The dimension to edit.
   */
  public readonly dimension = model<PhysicalDimension>();

  /**
   * True if the control is disabled.
   */
  public readonly disabled = input<boolean>();

  /**
   * True if the control should not show the tag field.
   */
  public readonly noTag = input<boolean>();

  public value: FormControl<number>;
  public unit: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.value = formBuilder.control(0, { nonNullable: true });
    this.unit = formBuilder.control(null, Validators.required);
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.form = formBuilder.group({
      value: this.value,
      unit: this.unit,
      tag: this.tag,
    });

    // when dimension changes, update form
    effect(() => {
      this.updateForm(this.dimension());
    });

    // when disabled changes, update form
    effect(() => {
      if (this.disabled()) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    });
  }

  public ngOnInit(): void {
    this.updateForm(this.dimension());

    // on change emit event
    this._sub = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe((_) => {
        if (!this._changeFrozen) {
          this.dimension.set(this.getModel());
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private updateForm(model?: PhysicalDimension): void {
    this._changeFrozen = true;
    if (!model) {
      this.form.reset();
    } else {
      this.value.setValue(model.value);
      this.unit.setValue(model.unit);
      this.tag.setValue(model.tag || null);
      this.form.markAsPristine();
    }
    this._changeFrozen = false;
  }

  private getModel(): PhysicalDimension {
    return {
      value: this.value.value || 0,
      unit: this.unit.value || '',
      tag: this.tag.value || undefined,
    };
  }
}
