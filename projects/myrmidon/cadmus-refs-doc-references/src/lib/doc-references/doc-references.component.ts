import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  OnDestroy,
  QueryList,
  untracked,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  applyEach,
  FieldTree,
  FormField,
  form,
  maxLength,
  required,
} from '@angular/forms/signals';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

/**
 * A generic compact document reference.
 */
export interface DocReference {
  type?: string;
  tag?: string;
  citation: string;
  note?: string;
}

/**
 * The editable controls for a single reference row.
 */
interface DocReferenceControls {
  type: string;
  tag: string;
  citation: string;
  note: string;
}

/**
 * Real-time editor for a set of DocReference's.
 * Set the references with the references property, and get their changes
 * in real-time via referencesChange. Usually you should set the references
 * property once in the container of this component (e.g. using an
 * initialRefs string array, changed only when a new model is set), and
 * then change the references as emitted by this component in a FormControl
 * with an array value.
 * So for instance you would have [references]="initialRefs" and
 * (referencesChange)="onRefsChange($event)", and in this handler you would
 * just call references.setValue(refs). This is required to avoid a
 * recursive update (setting references would trigger referencesChange, which
 * in turn would trigger setting references again, and so on), and is due
 * to the fact that this component has no "save" action, but automatically
 * emits changes a few milliseconds after they happen.
 */
@Component({
  selector: 'cadmus-refs-doc-references',
  templateUrl: './doc-references.component.html',
  styleUrls: ['./doc-references.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocReferencesComponent implements AfterViewInit, OnDestroy {
  private _suppressAuthorFocus = false;
  private _authorSubscription: Subscription | undefined;

  @ViewChildren('author') authorQueryList: QueryList<any> | undefined;

  /**
   * The references.
   */
  public readonly references = model<DocReference[]>([]);

  // doc-reference-types
  public readonly typeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * The editable draft, derived from `references` but writable in place.
   * `previous` tells an external change apart from the echo of our own save:
   * when the incoming references are just what the current draft maps to,
   * the draft is already up to date and keeping it preserves in-progress
   * edits (e.g. whitespace the save trims).
   */
  private readonly _draft = linkedSignal<
    DocReference[],
    { references: DocReferenceControls[] }
  >({
    source: () => this.references(),
    computation: (references, previous) =>
      previous &&
      this.referencesEqual(this.getReferences(previous.value), references)
        ? previous.value
        : this.toDraft(references),
  });

  public readonly form: FieldTree<{ references: DocReferenceControls[] }>;

  constructor() {
    this.form = form(this._draft, (path) => {
      applyEach(path.references, (item) => {
        maxLength(item.type, 50);
        maxLength(item.tag, 50);
        required(item.citation);
        maxLength(item.citation, 100);
        maxLength(item.note, 300);
      });
    });

    // the draft mirrors the bound references again: no unsaved edits, so
    // clear the interaction state, and don't steal focus into the last row
    // (this row set came from outside, the user did not just add it)
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (this.isDraftInSync(draft)) {
          this._suppressAuthorFocus = true;
          this.form().reset();
        }
      });
    });

    // autosave on any row edit (add/remove/move already save synchronously)
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        this.saveReferences();
      });
  }

  public ngAfterViewInit(): void {
    // focus on newly added author
    this._authorSubscription = this.authorQueryList?.changes
      .pipe(debounceTime(300))
      .subscribe((lst: QueryList<any>) => {
        const suppress = this._suppressAuthorFocus;
        this._suppressAuthorFocus = false;
        if (!suppress && lst.length > 0) {
          lst.last.nativeElement.focus();
        }
      });
  }

  public ngOnDestroy(): void {
    this._authorSubscription?.unsubscribe();
  }

  // #region Authors
  private toControls(reference?: DocReference): DocReferenceControls {
    return {
      type: reference?.type || '',
      tag: reference?.tag || '',
      citation: reference?.citation || '',
      note: reference?.note || '',
    };
  }

  public addReference(reference?: DocReference): void {
    this._draft.update((v) => ({
      references: [...v.references, this.toControls(reference)],
    }));
    this.saveReferences();
  }

  public removeReference(index: number): void {
    this._draft.update((v) => ({
      references: v.references.filter((_, i) => i !== index),
    }));
    this.saveReferences();
  }

  public moveReferenceUp(index: number): void {
    if (index < 1) {
      return;
    }
    this._draft.update((v) => {
      const references = [...v.references];
      const item = references[index];
      references.splice(index, 1);
      references.splice(index - 1, 0, item);
      return { references };
    });
    this.saveReferences();
  }

  public moveReferenceDown(index: number): void {
    if (index + 1 >= this._draft().references.length) {
      return;
    }
    this._draft.update((v) => {
      const references = [...v.references];
      const item = references[index];
      references.splice(index, 1);
      references.splice(index + 1, 0, item);
      return { references };
    });
    this.saveReferences();
  }

  public clearReferences(): void {
    this._draft.set({ references: [] });
    this.saveReferences();
  }
  // #endregion

  /** True when the draft still mirrors the bound references. */
  private isDraftInSync(draft: {
    references: DocReferenceControls[];
  }): boolean {
    return this.referencesEqual(
      this.getReferences(draft),
      this.getReferences(this.toDraft(this.references())),
    );
  }

  private toDraft(references: DocReference[] | undefined): {
    references: DocReferenceControls[];
  } {
    return { references: (references || []).map((r) => this.toControls(r)) };
  }

  protected getReferences(
    draft: { references: DocReferenceControls[] } = this._draft(),
  ): DocReference[] {
    return draft.references.map((r) => ({
      type: r.type ? r.type.trim() : undefined,
      tag: r.tag ? r.tag.trim() : undefined,
      citation: r.citation ? r.citation.trim() : undefined,
      note: r.note ? r.note.trim() : undefined,
    })) as DocReference[];
  }

  private referencesEqual(a: DocReference[], b?: DocReference[]): boolean {
    if (!b || a.length !== b.length) {
      return false;
    }
    return a.every(
      (r, i) =>
        r.type === b[i].type &&
        r.tag === b[i].tag &&
        r.citation === b[i].citation &&
        r.note === b[i].note,
    );
  }

  public saveReferences(): void {
    const next = this.getReferences();
    if (!this.referencesEqual(next, this.references())) {
      this.references.set(next);
    }
  }

}
