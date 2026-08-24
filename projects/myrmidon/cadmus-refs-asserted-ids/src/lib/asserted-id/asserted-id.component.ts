import {
  ChangeDetectionStrategy,
  Component,
  effect,
  Inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  required,
} from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

// bricks
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

// cadmus
import { IndexLookupDefinitions, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

// local
import { PinRefLookupService } from '../services/pin-ref-lookup.service';
import { ScopedPinLookupComponent } from '../scoped-pin-lookup/scoped-pin-lookup.component';

/**
 * An asserted ID.
 */
export interface AssertedId {
  tag?: string;
  value: string;
  label?: string;
  scope: string;
  assertion?: Assertion;
}

interface AssertedIdControls {
  tag: string;
  value: string;
  label: string;
  scope: string;
  assertion: Assertion | null;
}

function makeDefaultDraft(): AssertedIdControls {
  return { tag: '', value: '', label: '', scope: '', assertion: null };
}

/**
 * Asserted ID editor component.
 */
@Component({
  selector: 'cadmus-refs-asserted-id',
  templateUrl: './asserted-id.component.html',
  styleUrls: ['./asserted-id.component.css'],
  imports: [
    FormField,
    // material
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    // bricks
    AssertionComponent,
    ScopedPinLookupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedIdComponent {
  // set synchronously wherever `id` is written (not inside the effect
  // below), paired with _hasLastId since undefined is both "never saved
  // yet" and a legitimate real value - see signal-forms-migration.md.
  private _lastId: AssertedId | undefined = undefined;
  private _hasLastId = false;
  // a JSON snapshot of the draft as of the last external sync or emitted
  // save - see the cadmus-refs-assertion entry in
  // signal-forms-migration.md for why this, not a synchronous flag, is
  // needed to tell "the draft changed only because of a sync we already
  // accounted for" apart from a real user edit.
  private _lastSyncedDraft = '';

  private readonly _draft = signal<AssertedIdControls>(makeDefaultDraft());
  public readonly form = form(this._draft, (path) => {
    maxLength(path.tag, 50);
    required(path.value);
    maxLength(path.value, 500);
    maxLength(path.label, 500);
    maxLength(path.scope, 500);
  });

  public readonly lookupExpanded = signal<boolean>(false);

  // asserted-id-scopes
  public readonly idScopeEntries = input<ThesaurusEntry[]>();
  // asserted-id-tags
  public readonly idTagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  /**
   * The asserted ID being edited.
   */
  public readonly id = model<AssertedId>();

  /**
   * True to hide the pin-based EID lookup UI.
   */
  public readonly noEidLookup = input<boolean>();

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * True to show the submit button.
   */
  public readonly hasSubmit = input<boolean>();

  /**
   * Emitted when the editor is closed.
   */
  public readonly editorClose = output();

  constructor(
    public lookupService: PinRefLookupService,
    @Inject('indexLookupDefinitions')
    public lookupDefs: IndexLookupDefinitions
  ) {
    // when id changes, update form
    effect(() => {
      const id = this.id();
      if (this._hasLastId && this._lastId === id) {
        return;
      }
      this._lastId = id;
      this._hasLastId = true;
      this.updateForm(id);
    });

    // autosave
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        if (JSON.stringify(this._draft()) === this._lastSyncedDraft) {
          return;
        }
        this.emitIdChange();
      });
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this._draft.update((v) => ({ ...v, assertion: assertion || null }));
  }

  public onIdPick(id: string): void {
    this._draft.update((v) => ({ ...v, value: id }));
    this.form.value().markAsDirty();
    this.lookupExpanded.set(false);
  }

  private updateForm(value: AssertedId | undefined): void {
    const draft = !value
      ? makeDefaultDraft()
      : {
          tag: value.tag || '',
          value: value.value,
          label: value.label || '',
          scope: value.scope,
          assertion: value.assertion || null,
        };
    this._draft.set(draft);
    this._lastSyncedDraft = JSON.stringify(draft);
    this.form().reset();
  }

  private getId(): AssertedId {
    const v = this._draft();
    return {
      tag: v.tag.trim() || undefined,
      value: v.value.trim() || '',
      label: v.label.trim() || undefined,
      scope: v.scope.trim() || '',
      assertion: v.assertion || undefined,
    };
  }

  public emitIdChange(): void {
    if (!this.hasSubmit()) {
      const id = this.getId();
      this._lastId = id;
      this._hasLastId = true;
      this._lastSyncedDraft = JSON.stringify(this._draft());
      this.id.set(id);
    }
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().valid()) {
      this.id.set(this.getId());
    }
  }

}
