import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { take } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { deepCopy, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { HistoricalDatePipe } from '@myrmidon/cadmus-refs-historical-date';

import {
  AssertedChronotope,
  AssertedChronotopeComponent,
} from '../asserted-chronotope/asserted-chronotope.component';

/**
 * Editor for a set of asserted chronotopes.
 */
@Component({
  selector: 'cadmus-asserted-chronotope-set',
  templateUrl: './asserted-chronotope-set.component.html',
  styleUrls: ['./asserted-chronotope-set.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AssertedChronotopeComponent,
    HistoricalDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedChronotopeSetComponent implements OnInit {
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedChronotope | undefined>(undefined);

  /**
   * The edited chronotopes.
   */
  public readonly chronotopes = model<AssertedChronotope[]>();

  // chronotope-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // chronotope-assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  // chronotope-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();
  // chronotope-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  public entries: FormControl<AssertedChronotope[]>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder, private _dialogService: DialogService) {
    // form
    this.entries = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    this.form = formBuilder.group({
      entries: this.entries,
    });

    // when chronotopes change, update form
    effect(() => {
      const chronotopes = this.chronotopes();
      console.log('chronotopes', chronotopes);
      this.updateForm(chronotopes);
    });
  }

  public ngOnInit(): void {
    if (this.chronotopes()?.length) {
      this.updateForm(this.chronotopes());
    }
  }

  private updateForm(chronotopes: AssertedChronotope[] | undefined): void {
    if (!chronotopes) {
      this.form!.reset();
      return;
    }
    this.entries.setValue(chronotopes || []);
    this.form.markAsPristine();
  }

  public addChronotope(): void {
    this.editChronotope(Object.create(null));
  }

  public editChronotope(
    chronotope: AssertedChronotope | null,
    index = -1
  ): void {
    if (!chronotope) {
      this.editedIndex.set(-1);
      this.edited.set(undefined);
    } else {
      this.editedIndex.set(index);
      this.edited.set(deepCopy(chronotope));
    }
  }

  public onChronotopeChange(chronotope?: AssertedChronotope): void {
    this.edited.set(chronotope!);
  }

  public onChronotopeSave(): void {
    if (
      !this.edited() ||
      Object.keys(this.edited() || {}).length === 0 ||
      (!this.edited()?.place && !this.edited()?.date)
    ) {
      return;
    }

    const chronotopes = [...this.entries.value];

    if (this.editedIndex() > -1) {
      chronotopes.splice(this.editedIndex(), 1, this.edited()!);
    } else {
      chronotopes.push(this.edited()!);
    }

    this.entries.setValue(chronotopes);
    this.entries.updateValueAndValidity();
    this.entries.markAsDirty();
    this.editChronotope(null);
    this.saveChronotopes();
  }

  public deleteChronotope(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete chronotope?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          const entries = [...this.entries.value];
          entries.splice(index, 1);
          this.entries.setValue(entries);
          this.entries.updateValueAndValidity();
          this.entries.markAsDirty();
          this.saveChronotopes();
        }
      });
  }

  public moveChronotopeUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.updateValueAndValidity();
    this.entries.markAsDirty();
    this.saveChronotopes();
  }

  public moveChronotopeDown(index: number): void {
    if (index + 1 >= this.entries.value.length) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.updateValueAndValidity();
    this.entries.markAsDirty();
    this.saveChronotopes();
  }

  private saveChronotopes(): void {
    const chronotopes = this.entries.value?.length ? this.entries.value : [];
    this.chronotopes.set(chronotopes);
  }
}
