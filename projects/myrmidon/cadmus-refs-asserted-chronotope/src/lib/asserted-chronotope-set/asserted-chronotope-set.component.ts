import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { FieldTree, form } from '@angular/forms/signals';
import { take } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { HistoricalDatePipe } from '@myrmidon/cadmus-refs-historical-date';
import {
  LookupProviderOptions,
  RefLookupConfig,
} from '@myrmidon/cadmus-refs-lookup';

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
export class AssertedChronotopeSetComponent {
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedChronotope | undefined>(undefined);
  public readonly placeLabels = signal<Record<string, string>>({});

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

  public readonly lookupProviderOptions = input<
    LookupProviderOptions | undefined
  >();

  /**
   * The configuration of the lookup service for places.
   * When set, the place will be fetched from a service rather
   * than manually entered. Passed through to the child
   * AssertedChronotopeComponent.
   */
  public readonly placeLookupConfig = input<RefLookupConfig>();

  private readonly _draft = signal<{ entries: AssertedChronotope[] }>({
    entries: [],
  });
  public readonly form: FieldTree<{ entries: AssertedChronotope[] }>;

  constructor(private _dialogService: DialogService) {
    this.form = form(this._draft, (path) => {
      NgxToolsSignalValidators.strictMinLength(path.entries, 1);
    });

    // when chronotopes change, update form
    effect(() => {
      const chronotopes = this.chronotopes();
      this.updateForm(chronotopes);
    });

    // resolve place labels when chronotopes or lookup config change
    effect(() => {
      const chronotopes = this.chronotopes();
      const cfg = this.placeLookupConfig();

      if (!cfg?.service || !cfg?.itemIdGetter || !chronotopes?.length) {
        this.placeLabels.set({});
        return;
      }

      const currentLabels = untracked(() => this.placeLabels());

      for (const entry of chronotopes) {
        const rawValue = entry.place?.value;
        if (!rawValue || currentLabels[rawValue]) {
          continue;
        }
        const serviceId = cfg.itemIdParser
          ? cfg.itemIdParser(rawValue)
          : rawValue;
        cfg.service
          .getById(serviceId)
          .pipe(take(1))
          .subscribe((item) => {
            if (item) {
              const label = cfg.itemLabelGetter
                ? cfg.itemLabelGetter(item)
                : cfg.service?.getName(item);
              this.placeLabels.update((labels) => ({
                ...labels,
                [rawValue]:
                  label && label !== rawValue
                    ? `${label} (${rawValue})`
                    : rawValue,
              }));
            }
          });
      }
    });
  }

  private updateForm(chronotopes: AssertedChronotope[] | undefined): void {
    // map into fresh objects rather than adopting the caller's own
    // AssertedChronotope references directly - see
    // signal-forms-migration.md (cadmus-refs-decorated-ids entry) for why.
    this._draft.set({
      entries: (chronotopes || []).map((c) => ({
        place: c.place,
        date: c.date,
      })),
    });
    this.form().reset();
  }

  public addChronotope(): void {
    this.editedIndex.set(-1);
    this.edited.set({});
  }

  public editChronotope(chronotope: AssertedChronotope, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(chronotope));
  }

  public closeChronotope(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
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

    const entries = [...this._draft().entries];

    if (this.editedIndex() > -1) {
      entries.splice(this.editedIndex(), 1, this.edited()!);
    } else {
      entries.push(this.edited()!);
    }

    this._draft.set({ entries });
    this.form.entries().markAsDirty();
    this.closeChronotope();
    this.saveChronotopes();
  }

  public deleteChronotope(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete chronotope?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          const entries = [...this._draft().entries];
          entries.splice(index, 1);
          this._draft.set({ entries });
          this.form.entries().markAsDirty();
          this.saveChronotopes();
        }
      });
  }

  public moveChronotopeUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entries = [...this._draft().entries];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this._draft.set({ entries });
    this.form.entries().markAsDirty();
    this.saveChronotopes();
  }

  public moveChronotopeDown(index: number): void {
    if (index + 1 >= this._draft().entries.length) {
      return;
    }
    const entries = [...this._draft().entries];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this._draft.set({ entries });
    this.form.entries().markAsDirty();
    this.saveChronotopes();
  }

  private saveChronotopes(): void {
    const entries = this._draft().entries;
    this.chronotopes.set(
      entries.length
        ? entries.map((c) => ({ place: c.place, date: c.date }))
        : [],
    );
  }

}
