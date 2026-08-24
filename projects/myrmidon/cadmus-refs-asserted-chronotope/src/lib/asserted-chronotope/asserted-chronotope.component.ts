import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import { FieldTree, FormField, form, maxLength, required } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';
import {
  LookupProviderOptions,
  RefLookupComponent,
  RefLookupConfig,
} from '@myrmidon/cadmus-refs-lookup';
import {
  AssertedHistoricalDate,
  HistoricalDateComponent,
  HistoricalDateModel,
  HistoricalDatePipe,
} from '@myrmidon/cadmus-refs-historical-date';
/**
 * A place with an optional assertion.
 */
export interface AssertedPlace {
  tag?: string;
  value: string;
  assertion?: Assertion;
}

/**
 * Asserted chronotope: a place with an optional assertion, and/or a date with an
 * optional assertion.
 */
export interface AssertedChronotope {
  place?: AssertedPlace;
  date?: AssertedHistoricalDate;
}

interface PlaceControls {
  tag: string;
  assertion: Assertion | null;
  place: string;
}

function makeDefaultPlaceDraft(): PlaceControls {
  return { tag: '', assertion: null, place: '' };
}

interface DateControls {
  tag: string;
  assertion: Assertion | null;
  date: HistoricalDateModel | null;
}

function makeDefaultDateDraft(): DateControls {
  return { tag: '', assertion: null, date: null };
}

/**
 * Asserted chronotope editor.
 */
@Component({
  selector: 'cadmus-refs-asserted-chronotope',
  templateUrl: './asserted-chronotope.component.html',
  styleUrls: ['./asserted-chronotope.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    AssertionComponent,
    HistoricalDateComponent,
    HistoricalDatePipe,
    RefLookupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedChronotopeComponent {
  /**
   * The chronotope to edit.
   */
  public readonly chronotope = model<AssertedChronotope>();

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The configuration of the lookup service for places.
   * When set, the place will be fetched from a service rather
   * than manually entered.
   */
  public readonly placeLookupConfig = input<RefLookupConfig>();

  // chronotope-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public refTagEntries = input<ThesaurusEntry[]>();

  // place
  public placeExpanded = signal(false);
  public placeItemId = signal<string | undefined>(undefined);
  public placeDisplayLabel = signal<string | undefined>(undefined);
  public hasPlace = signal(false);
  private readonly _plDraft = signal<PlaceControls>(makeDefaultPlaceDraft());
  public readonly plForm: FieldTree<PlaceControls>;

  // date
  public dateExpanded = signal(false);
  public hasDate = signal(false);
  private readonly _dtDraft = signal<DateControls>(makeDefaultDateDraft());
  public readonly dtForm: FieldTree<DateControls>;

  constructor() {
    this.plForm = form(this._plDraft, (path) => {
      maxLength(path.tag, 50);
      required(path.place);
      maxLength(path.place, 50);
    });
    this.dtForm = form(this._dtDraft, (path) => {
      maxLength(path.tag, 50);
      required(path.date);
    });

    // when chronotope changes, update the form
    effect(() => {
      this.updateForm(this.chronotope());
    });
  }

  /**
   * Handle the user toggling the "has place" checkbox. Only fires for
   * genuine user interaction (mat-checkbox's (change) output, unlike a
   * value-watching subscription, never fires for the programmatic writes
   * updateForm()/savePlace() make), so no "was this our own echo" guard
   * is needed here at all.
   */
  public onHasPlaceChange(checked: boolean): void {
    this.hasPlace.set(checked);
    if (checked) {
      // use setTimeout to avoid potential timing issues with form updates
      setTimeout(() => this.editPlace(), 0);
    } else {
      // close the place editor if unchecked
      this._plDraft.set(makeDefaultPlaceDraft());
      this.plForm().reset();
      // update chronotope after place change
      this.chronotope.set(this.getChronotope());
    }
  }

  /**
   * Handle the user toggling the "has date" checkbox - see
   * onHasPlaceChange() for why no echo guard is needed.
   */
  public onHasDateChange(checked: boolean): void {
    this.hasDate.set(checked);
    if (checked) {
      // use setTimeout to avoid potential timing issues with form updates
      setTimeout(() => this.editDate(), 0);
    } else {
      // close the date editor if unchecked
      this._dtDraft.set(makeDefaultDateDraft());
      this.dtForm().reset();
      // update chronotope after date change
      this.chronotope.set(this.getChronotope());
    }
  }

  private updateForm(chronotope: AssertedChronotope | undefined): void {
    this.placeExpanded.set(false);
    this.dateExpanded.set(false);

    if (!chronotope) {
      this.hasPlace.set(false);
      this.hasDate.set(false);
      this._plDraft.set(makeDefaultPlaceDraft());
      this._dtDraft.set(makeDefaultDateDraft());
      this.plForm().reset();
      this.dtForm().reset();
      this.placeItemId.set(undefined);
      this.placeDisplayLabel.set(undefined);
    } else {
      this.hasPlace.set(chronotope.place ? true : false);
      this._plDraft.set({
        tag: chronotope.place?.tag || '',
        assertion: chronotope.place?.assertion || null,
        place: chronotope.place?.value || '',
      });
      // if in lookup mode, resolve place ID for the lookup component
      const cfg = this.placeLookupConfig();
      if (cfg) {
        const raw = chronotope.place?.value;
        this.placeItemId.set(
          raw ? (cfg.itemIdParser ? cfg.itemIdParser(raw) : raw) : undefined,
        );
        // label will be set asynchronously when the lookup resolves
        this.placeDisplayLabel.set(undefined);
      }
      this.plForm().reset();

      this.hasDate.set(chronotope.date ? true : false);
      this._dtDraft.set({
        tag: chronotope.date?.tag || '',
        assertion: chronotope.date?.assertion || null,
        date: (chronotope.date as HistoricalDateModel) || null,
      });
      this.dtForm().reset();
    }
  }

  public editPlace(): void {
    const chronotope = this.chronotope();
    this._plDraft.update((v) => ({
      ...v,
      place: chronotope?.place?.value || '',
      assertion: chronotope?.place?.assertion || null,
    }));
    this.placeExpanded.set(true);
  }

  public onPlaceLookupChange(item: any): void {
    const cfg = this.placeLookupConfig();
    if (!item || !cfg?.itemIdGetter) {
      this._plDraft.update((v) => ({ ...v, place: '' }));
      this.placeDisplayLabel.set(undefined);
    } else {
      const id = cfg.itemIdGetter(item);
      this._plDraft.update((v) => ({ ...v, place: id }));
      // build display label: "label (id)" or just the id
      const label = cfg.itemLabelGetter
        ? cfg.itemLabelGetter(item)
        : cfg.service?.getName(item);
      this.placeDisplayLabel.set(
        label && label !== id ? `${label} (${id})` : id,
      );
    }
    this.plForm.place().markAsDirty();
  }

  public onPlAssertionChange(assertion: Assertion | undefined): void {
    this._plDraft.update((v) => ({ ...v, assertion: assertion || null }));
    this.plForm.assertion().markAsDirty();
  }

  public closePlace(): void {
    this.placeExpanded.set(false);
  }

  public savePlace(): void {
    // save if valid
    if (this.plForm().valid()) {
      this.hasPlace.set(true);
      this.chronotope.set(this.getChronotope());
    } else {
      this.hasPlace.set(false);
    }
    // close the form
    this.placeExpanded.set(false);
  }

  public onPlaceFormSubmit(event: Event): void {
    event.preventDefault();
    this.savePlace();
  }

  public editDate(): void {
    const chronotope = this.chronotope();
    this._dtDraft.update((v) => ({
      ...v,
      date: chronotope?.date || null,
      assertion: chronotope?.date?.assertion || null,
    }));
    this.dateExpanded.set(true);
  }

  public onDtAssertionChange(assertion: Assertion | undefined): void {
    this._dtDraft.update((v) => ({ ...v, assertion: assertion || null }));
    this.dtForm.assertion().markAsDirty();
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this._dtDraft.update((v) => ({ ...v, date: date || null }));
    this.dtForm.date().markAsDirty();
  }

  public closeDate(): void {
    this.dateExpanded.set(false);
  }

  public saveDate(): void {
    // save if valid
    if (this.dtForm().valid()) {
      this.hasDate.set(true);
      this.chronotope.set(this.getChronotope());
    } else {
      this.hasDate.set(false);
    }
    // close the form
    this.dateExpanded.set(false);
  }

  public onDateFormSubmit(event: Event): void {
    event.preventDefault();
    this.saveDate();
  }

  private getChronotope(): AssertedChronotope {
    const pl = this._plDraft();
    const dt = this._dtDraft();
    return {
      place:
        this.hasPlace() && pl.place
          ? {
              tag: pl.tag.trim() || undefined,
              value: pl.place.trim(),
              assertion: pl.assertion || undefined,
            }
          : undefined,
      date:
        this.hasDate() && dt.date
          ? {
              ...dt.date,
              tag: dt.tag.trim() || undefined,
              assertion: dt.assertion || undefined,
            }
          : undefined,
    };
  }
}
