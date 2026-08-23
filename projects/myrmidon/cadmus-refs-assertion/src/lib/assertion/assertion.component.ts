import { ChangeDetectionStrategy, Component, effect, input, model, signal } from '@angular/core';
import { FormField, form, maxLength, min } from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

// material
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// bricks
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import {
  LookupDocReferencesComponent,
  LookupProviderOptions,
} from '@myrmidon/cadmus-refs-lookup';

// cadmus
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

/**
 * An assertion with optional references.
 */
export interface Assertion {
  tag?: string;
  rank: number;
  note?: string;
  references?: DocReference[];
}

interface AssertionControls {
  tag: string;
  rank: number;
  note: string;
  references: DocReference[];
}

function makeDefaultDraft(): AssertionControls {
  return { tag: '', rank: 0, note: '', references: [] };
}

/**
 * Editor for an assertion with optional references.
 */
@Component({
  selector: 'cadmus-refs-assertion',
  templateUrl: './assertion.component.html',
  styleUrls: ['./assertion.component.css'],
  imports: [
    FormField,
    // material
    MatBadgeModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    // bricks
    LookupDocReferencesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertionComponent {
  // set synchronously wherever `assertion` is written (not inside the
  // effect below), paired with _hasLastAssertion since undefined is both
  // "never saved yet" and a legitimate real value - see
  // signal-forms-migration.md.
  private _lastAssertion: Assertion | undefined = undefined;
  private _hasLastAssertion = false;
  // a JSON snapshot of the draft as of the last updateForm() sync,
  // recorded so the debounced autosave can tell "the draft changed only
  // because updateForm() just wrote it" apart from a real user edit,
  // without relying on a synchronous flag - toObservable()'s emission is
  // deferred (its own internal effect), so a flag set-then-cleared
  // synchronously inside updateForm() would always read back false by
  // the time the debounced subscriber saw it (the same hazard found
  // while porting cadmus-geo-location).
  private _lastSyncedDraft = '';

  private readonly _draft = signal<AssertionControls>(makeDefaultDraft());
  public readonly form = form(this._draft, (path) => {
    maxLength(path.tag, 50);
    maxLength(path.note, 500);
    min(path.rank, 0);
  });

  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  /**
   * The assertion being edited.
   */
  public readonly assertion = model<Assertion>();

  /**
   * True to disable the lookup set.
   */
  public readonly noLookup = input<boolean>();

  /**
   * True to disable the citation builder.
   */
  public readonly noCitation = input<boolean>();

  /**
   * The default picker to show when the editor opens.
   */
  public readonly defaultPicker = input<'citation' | 'lookup'>('citation');

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  public readonly visualExpanded = signal<boolean>(false);

  constructor() {
    // when assertion changes, update form
    effect(() => {
      const assertion = this.assertion();
      if (this._hasLastAssertion && this._lastAssertion === assertion) {
        return;
      }
      this._lastAssertion = assertion;
      this._hasLastAssertion = true;
      this.updateForm(assertion);
    });

    // autosave
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        if (JSON.stringify(this._draft()) === this._lastSyncedDraft) {
          return;
        }
        this.saveAssertion();
      });
  }

  public onReferencesChange(references: DocReference[]): void {
    this.form
      .references()
      .value.set(references.map((r) => ({ ...r })));
    this.saveAssertion();
  }

  private updateForm(value: Assertion | undefined): void {
    const draft = !value
      ? makeDefaultDraft()
      : {
          tag: value.tag || '',
          rank: value.rank,
          note: value.note || '',
          references: (value.references || []).map((r) => ({ ...r })),
        };
    this._draft.set(draft);
    this._lastSyncedDraft = JSON.stringify(draft);
    this.form().reset();
  }

  private getAssertion(): Assertion | undefined {
    const v = this._draft();
    const assertion: Assertion = {
      tag: v.tag.trim() || undefined,
      rank: v.rank,
      note: v.note.trim() || undefined,
      references: v.references.length
        ? v.references.map((r) => ({ ...r }))
        : undefined,
    };
    if (
      !assertion.tag &&
      !assertion.rank &&
      !assertion.note &&
      !assertion.references?.length
    ) {
      return undefined;
    }
    return assertion;
  }

  public saveAssertion(): void {
    const next = this.getAssertion();
    this._lastAssertion = next;
    this._hasLastAssertion = true;
    this._lastSyncedDraft = JSON.stringify(this._draft());
    this.assertion.set(next);
  }
}
