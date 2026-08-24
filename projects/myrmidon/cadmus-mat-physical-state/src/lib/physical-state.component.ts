import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';

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

interface PhysicalStateDraft {
  type: string;
  features: string[];
  hasDate: boolean;
  date: string | null;
  reporter: string;
  note: string;
}

function makeDefaultDraft(): PhysicalStateDraft {
  return {
    type: '',
    features: [],
    hasDate: false,
    date: null,
    reporter: '',
    note: '',
  };
}

@Component({
  selector: 'cadmus-mat-physical-state',
  imports: [
    CommonModule,
    FormField,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalStateComponent {
  private readonly _draft = signal<PhysicalStateDraft>(makeDefaultDraft());
  public readonly form = form(this._draft, (path) => {
    required(path.type);
    maxLength(path.type, 100);
    required(path.reporter);
    maxLength(path.reporter, 100);
    maxLength(path.note, 5000);
  });

  /**
   * The state being edited.
   */
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

  /**
   * Flags computed from featEntries.
   */
  public readonly flags = computed(() => {
    return this.featEntries()?.map(entryToFlag) || [];
  });

  /**
   * Emitted when the edit is canceled.
   */
  public readonly stateCancel = output();

  constructor() {
    // when state changes, update form
    effect(() => {
      this.updateForm(this.state());
    });
  }

  private updateForm(state?: PhysicalState): void {
    if (!state) {
      this._draft.set(makeDefaultDraft());
    } else {
      this._draft.set({
        type: state.type,
        features: state.features || [],
        hasDate: !!state.date,
        date: state.date || null,
        reporter: state.reporter || '',
        note: state.note || '',
      });
    }
    this.form().reset();
  }

  public onCheckedIdsChange(ids: string[]): void {
    this.form.features().value.set(ids);
    this.form.features().markAsDirty();
  }

  private dateToYmd(date: string | null): string | undefined {
    if (!date) {
      return undefined;
    }
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getState(): PhysicalState {
    return {
      type: this.form.type().value().trim(),
      features: this.form.features().value().length
        ? this.form.features().value()
        : undefined,
      date:
        this.form.hasDate().value() && this.form.date().value()
          ? this.dateToYmd(this.form.date().value())
          : undefined,
      reporter: this.form.reporter().value().trim() || undefined,
      note: this.form.note().value().trim() || undefined,
    };
  }

  public cancel(): void {
    this.stateCancel.emit();
  }

  public save(): void {
    this.state.set(this.getState());
  }

  public onFormSubmit(event: Event): void {
    event.preventDefault();
    this.save();
  }
}
