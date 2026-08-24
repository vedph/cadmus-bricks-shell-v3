import {
  ChangeDetectionStrategy,
  Component,
  effect,
  Inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
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

/** Map a bound asserted ID to the editable draft shape. */
function toDraft(value: AssertedId | undefined): AssertedIdControls {
  return !value
    ? makeDefaultDraft()
    : {
        tag: value.tag || '',
        value: value.value,
        label: value.label || '',
        scope: value.scope,
        assertion: value.assertion || null,
      };
}

/** Map the draft back to an asserted ID. */
function toId(v: AssertedIdControls): AssertedId {
  return {
    tag: v.tag.trim() || undefined,
    value: v.value.trim() || '',
    label: v.label.trim() || undefined,
    scope: v.scope.trim() || '',
    assertion: v.assertion || undefined,
  };
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
  /**
   * The asserted ID being edited.
   */
  public readonly id = model<AssertedId>();

  /**
   * The editable draft, derived from `id` but writable in place.
   * `previous` tells an external change apart from the echo of our own
   * save: when the incoming ID is just what the current draft maps to, the
   * draft is already up to date and keeping it preserves in-progress edits
   * that saving normalizes away (whitespace still being typed).
   */
  private readonly _draft = linkedSignal<
    AssertedId | undefined,
    AssertedIdControls
  >({
    source: () => this.id(),
    computation: (id, previous) =>
      previous &&
      JSON.stringify(id) === JSON.stringify(toId(previous.value))
        ? previous.value
        : toDraft(id),
  });

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
    // the draft mirrors the bound ID again: no unsaved edits, so clear the
    // interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (this.isDraftInSync(draft)) {
          this.form().reset();
        }
      });
    });

    // autosave, but only once the draft has actually diverged from what is
    // bound - otherwise merely receiving an ID would save a normalized copy
    // of it straight back over the original
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        if (this.isDraftInSync(this._draft())) {
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

  /** True when the draft still mirrors the bound ID. */
  private isDraftInSync(draft: AssertedIdControls): boolean {
    return JSON.stringify(draft) === JSON.stringify(toDraft(this.id()));
  }

  private getId(): AssertedId {
    return toId(this._draft());
  }

  public emitIdChange(): void {
    if (!this.hasSubmit()) {
      this.id.set(this.getId());
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
