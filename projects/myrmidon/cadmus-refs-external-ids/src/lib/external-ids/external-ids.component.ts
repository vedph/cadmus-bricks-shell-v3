import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  OnDestroy,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import {
  applyEach,
  FieldTree,
  FormField,
  form,
  maxLength,
  required,
} from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

/**
 * A generic ID referred to an external resource.
 */
export interface ExternalId {
  value: string;
  scope?: string;
  tag?: string;
  assertion?: Assertion;
}

/**
 * An external ID plus a rank.
 */
export interface RankedExternalId extends ExternalId {
  rank?: number;
}

interface ExternalIdControls {
  value: string;
  scope: string;
  tag: string;
  rank: number | null;
  assertion: Assertion | null;
}

interface ExternalIdsControls {
  idsArr: ExternalIdControls[];
}

// maps an incoming id into a fresh row object (never adopts the caller's
// own object references) - required both to normalize unset fields the
// way reactive forms did (undefined -> '' / null), and to keep the
// signal-forms FieldTree from tagging the caller's own objects with its
// internal array-item identity Symbol (see signal-forms-migration.md).
function toControls(id?: RankedExternalId): ExternalIdControls {
  return {
    value: id?.value ?? '',
    scope: id?.scope ?? '',
    tag: id?.tag ?? '',
    rank: id?.rank ?? null,
    assertion: id?.assertion ?? null,
  };
}

@Component({
  selector: 'cadmus-refs-external-ids',
  templateUrl: './external-ids.component.html',
  styleUrls: ['./external-ids.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    AssertionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExternalIdsComponent implements AfterViewInit, OnDestroy {
  private _idSubscription: Subscription | undefined;
  // set by updateForm() right before rebuilding the row list from an
  // external model sync, and consumed (cleared) the next time the
  // QueryList's changes fire - not reset synchronously at the end of
  // updateForm(), since idQueryList.changes only fires once change
  // detection has actually re-rendered the @for loop, well after
  // updateForm() itself returns (the same deferred-effect timing hazard
  // documented for toObservable() elsewhere in this migration).
  private _suppressFocus = false;

  // set synchronously wherever `ids` is written (not inside the effect
  // below), paired with _hasLastIds since undefined is both "never saved
  // yet" and a legitimate real value - see signal-forms-migration.md.
  private _lastIds: RankedExternalId[] | undefined = undefined;
  private _hasLastIds = false;
  // a JSON snapshot of the draft as of the last external sync or emitted
  // save, used by the debounced autosave to tell "the draft changed only
  // because of a sync/save we already accounted for" apart from a real
  // user edit - see the cadmus-refs-assertion entry in
  // signal-forms-migration.md for why a synchronous flag can't do this
  // job once toObservable()'s deferred emission is involved.
  private _lastSyncedDraft = '';

  @ViewChildren('id') idQueryList: QueryList<any> | undefined;

  /**
   * The external IDs.
   */
  public readonly ids = model<RankedExternalId[]>([]);

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The ID scopes thesaurus entries.
   */
  public readonly scopeEntries = input<ThesaurusEntry[]>();

  /**
   * The ID tags thesaurus entries.
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  private readonly _draft = signal<ExternalIdsControls>({ idsArr: [] });
  public readonly form: FieldTree<ExternalIdsControls>;
  public readonly idsArr: FieldTree<ExternalIdControls[]>;

  // edited assertion
  public readonly assEdOpen = signal<boolean>(false);
  public readonly assertionNr = signal<number>(0);
  public readonly assertion = signal<Assertion | null | undefined>(undefined);

  constructor() {
    this.form = form(this._draft, (path) => {
      applyEach(path.idsArr, (row) => {
        required(row.value);
        maxLength(row.value, 500);
        maxLength(row.scope, 50);
        maxLength(row.tag, 50);
      });
    });
    this.idsArr = this.form.idsArr;

    // when ids change, update form
    effect(() => {
      const ids = this.ids();
      if (this._hasLastIds && this._lastIds === ids) {
        return;
      }
      this._lastIds = ids;
      this._hasLastIds = true;
      this.updateForm(ids);
    });

    // autosave: debounced, and only when something actually changed
    // since the last external sync or explicit save (see _lastSyncedDraft)
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        if (JSON.stringify(this._draft()) === this._lastSyncedDraft) {
          return;
        }
        this.emitIdsChange();
      });
  }

  public ngAfterViewInit(): void {
    // focus on newly added ID
    this._idSubscription = this.idQueryList?.changes
      .pipe(debounceTime(300))
      .subscribe((lst: QueryList<any>) => {
        const suppress = this._suppressFocus;
        this._suppressFocus = false;
        if (!suppress && lst.length > 0) {
          lst.last.nativeElement.focus();
        }
      });
  }

  public ngOnDestroy(): void {
    this._idSubscription?.unsubscribe();
  }

  public addId(id?: RankedExternalId): void {
    this._draft.update((v) => ({ idsArr: [...v.idsArr, toControls(id)] }));
    this.emitIdsChange();
  }

  public removeId(index: number): void {
    this.closeAssertion();
    this._draft.update((v) => {
      const idsArr = [...v.idsArr];
      idsArr.splice(index, 1);
      return { idsArr };
    });
    this.emitIdsChange();
  }

  public moveIdUp(index: number): void {
    if (index < 1) {
      return;
    }
    this.closeAssertion();
    this._draft.update((v) => {
      const idsArr = [...v.idsArr];
      const item = idsArr[index];
      idsArr.splice(index, 1);
      idsArr.splice(index - 1, 0, item);
      return { idsArr };
    });
    this.emitIdsChange();
  }

  public moveIdDown(index: number): void {
    if (index + 1 >= this._draft().idsArr.length) {
      return;
    }
    this.closeAssertion();
    this._draft.update((v) => {
      const idsArr = [...v.idsArr];
      const item = idsArr[index];
      idsArr.splice(index, 1);
      idsArr.splice(index + 1, 0, item);
      return { idsArr };
    });
    this.emitIdsChange();
  }

  public clearIds(): void {
    this.closeAssertion();
    this._draft.set({ idsArr: [] });
    this.emitIdsChange();
  }

  public editAssertion(index: number): void {
    // save the currently edited assertion if any
    this.saveAssertion();
    // edit the new assertion
    this.assertion.set(this._draft().idsArr[index]?.assertion ?? null);
    this.assertionNr.set(index + 1);
    this.assEdOpen.set(true);
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.set(assertion);
  }

  public saveAssertion(): void {
    // save the currently edited assertion if any
    if (this.assertionNr()) {
      const idx = this.assertionNr() - 1;
      this._draft.update((v) => {
        const idsArr = [...v.idsArr];
        idsArr[idx] = { ...idsArr[idx], assertion: this.assertion() ?? null };
        return { idsArr };
      });
      this.closeAssertion();
      this.emitIdsChange();
    }
  }

  private closeAssertion(): void {
    if (this.assertionNr()) {
      this.assEdOpen.set(false);
      this.assertionNr.set(0);
      this.assertion.set(undefined);
    }
  }

  private updateForm(ids: RankedExternalId[]): void {
    this._suppressFocus = true;
    const draft: ExternalIdsControls = {
      idsArr: (ids || []).map((id) => toControls(id)),
    };
    this._draft.set(draft);
    this._lastSyncedDraft = JSON.stringify(draft);
  }

  private getIds(): RankedExternalId[] {
    return this._draft().idsArr.map((g) => ({
      value: g.value.trim(),
      scope: g.scope.trim() || undefined,
      tag: g.tag.trim() || undefined,
      rank: g.rank ?? undefined,
      assertion: g.assertion ?? undefined,
    }));
  }

  private emitIdsChange(): void {
    const ids = this.getIds();
    this._lastIds = ids;
    this._hasLastIds = true;
    this._lastSyncedDraft = JSON.stringify(this._draft());
    this.ids.set(ids);
  }

}
