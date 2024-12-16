import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  input,
  model,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { Flag, FlagSetComponent } from '@myrmidon/cadmus-ui-flag-set';

function entryToFlag(entry: ThesaurusEntry): Flag {
  return {
    id: entry.id,
    label: entry.value,
  };
}

/**
 * The physical preservation state of an object.
 */
export interface PhysicalState {
  type: string;
  features?: string[];
  date?: string;
  reporter?: string;
  note?: string;
}

@Component({
  selector: 'cadmus-mat-physical-state',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    FlagSetComponent,
  ],
  templateUrl: './physical-state.component.html',
  styleUrls: ['./physical-state.component.css'],
})
export class PhysicalStateComponent {
  public type: FormControl<string>;
  public features: FormControl<string[]>;
  public hasDate: FormControl<boolean>;
  public date: FormControl<string | null>;
  public reporter: FormControl<string | null>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  public readonly state = model<PhysicalState>();

  /**
   * True to hide UI about the recognition of the state (date and
   * reporter name).
   */
  public readonly noRecognition = input<boolean>();

  // physical-states
  public readonly stateEntries = input<ThesaurusEntry[]>();

  // physical-state-reporters
  public readonly reporterEntries = input<ThesaurusEntry[]>();

  // physical-state-features
  public readonly featEntries = input<ThesaurusEntry[]>();

  public readonly flags = computed(() => {
    return this.featEntries()?.map(entryToFlag) || [];
  });

  /**
   * Emitted when the edit is canceled.
   */
  public readonly stateCancel = output();

  constructor(formBuilder: FormBuilder) {
    this.type = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.features = formBuilder.control([], { nonNullable: true });
    this.hasDate = formBuilder.control(false, { nonNullable: true });
    this.date = formBuilder.control(new Date().toUTCString(), {});
    this.reporter = formBuilder.control(null, {
      validators: [Validators.required, Validators.maxLength(100)],
    });
    this.note = formBuilder.control(null, Validators.maxLength(5000));
    this.form = formBuilder.group({
      type: this.type,
      features: this.features,
      hasDate: this.hasDate,
      date: this.date,
      reporter: this.reporter,
      note: this.note,
    });

    // when state changes, update form
    effect(() => {
      this.updateForm(this.state());
    });
  }

  private updateForm(state?: PhysicalState): void {
    if (!state) {
      this.form.reset();
      return;
    }
    this.type.setValue(state.type);
    this.features.setValue(state.features || []);
    this.hasDate.setValue(!!state.date);
    this.date.setValue(state.date || null);
    this.reporter.setValue(state.reporter || null);
    this.note.setValue(state.note || null);
    this.form.markAsPristine();
  }

  public onCheckedIdsChange(ids: string[]): void {
    this.features.setValue(ids);
    this.features.markAsDirty();
    this.features.updateValueAndValidity();
  }

  private getState(): PhysicalState {
    return {
      type: this.type.value?.trim(),
      features: this.features.value?.length ? this.features.value : undefined,
      date: this.hasDate.value && this.date.value ? this.date.value : undefined,
      reporter: this.reporter.value?.trim(),
      note: this.note.value?.trim(),
    };
  }

  public cancel(): void {
    this.stateCancel.emit();
  }

  public save(): void {
    this.state.set(this.getState());
  }
}
