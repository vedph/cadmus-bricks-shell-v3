import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  signal,
  untracked,
} from '@angular/core';
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

/** Map a bound assertion to the editable draft shape. */
function toDraft(value: Assertion | undefined): AssertionControls {
  return !value
    ? makeDefaultDraft()
    : {
        tag: value.tag || '',
        rank: value.rank,
        note: value.note || '',
        references: (value.references || []).map((r) => ({ ...r })),
      };
}

/** Map the draft back to an assertion, or undefined when it is empty. */
function toAssertion(v: AssertionControls): Assertion | undefined {
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

  /**
   * The editable draft, derived from `assertion` but writable in place:
   * the form binds its controls straight to it. `previous` is what tells an
   * external change apart from the echo of our own save - when the incoming
   * assertion is just what the current draft maps to, the draft is already
   * up to date, and keeping it preserves in-progress edits that saving
   * normalizes away (a tag the user is still typing, trailing space and all).
   */
  private readonly _draft = linkedSignal<Assertion | undefined, AssertionControls>({
    source: () => this.assertion(),
    computation: (assertion, previous) =>
      previous &&
      JSON.stringify(assertion) === JSON.stringify(toAssertion(previous.value))
        ? previous.value
        : toDraft(assertion),
  });

  public readonly form = form(this._draft, (path) => {
    maxLength(path.tag, 50);
    maxLength(path.note, 500);
    min(path.rank, 0);
  });

  constructor() {
    // whenever the draft matches the bound assertion again there are no
    // unsaved edits, so clear the interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (this.isDraftInSync(draft)) {
          this.form().reset();
        }
      });
    });

    // autosave, but only once the draft has actually diverged from what is
    // bound - otherwise merely receiving an assertion would save a
    // normalized copy of it straight back over the original
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        if (this.isDraftInSync(this._draft())) {
          return;
        }
        this.saveAssertion();
      });
  }

  /** True when the draft still mirrors the bound assertion. */
  private isDraftInSync(draft: AssertionControls): boolean {
    return JSON.stringify(draft) === JSON.stringify(toDraft(this.assertion()));
  }

  public onReferencesChange(references: DocReference[]): void {
    this.form
      .references()
      .value.set(references.map((r) => ({ ...r })));
    this.saveAssertion();
  }

  public saveAssertion(): void {
    this.assertion.set(toAssertion(this._draft()));
  }
}
