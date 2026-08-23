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
  private _lastReferences: DocReference[] | undefined = undefined;
  private _hasLastReferences = false;
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

  private readonly _draft = signal<{ references: DocReferenceControls[] }>({
    references: [],
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

    // when references change, update form. `_lastReferences` is set
    // synchronously by saveReferences() at the moment it writes `references`
    // (see below), so this guard recognizes "this is an echo of our own
    // save" purely by reference, regardless of how much the draft may have
    // moved on by the time this effect actually runs (effects are
    // deferred, so further draft edits can legitimately happen first) - a
    // content-based comparison against the *current* draft would get this
    // wrong, since it would see the stale echoed value as "different from
    // the current draft" and stomp the newer edit trying to "fix" it. It is
    // also set here, unconditionally, whenever the effect actually
    // processes a value - guarding separately against this effect being
    // spuriously re-invoked with an unchanged *external* value.
    effect(() => {
      const refs = this.references();
      if (this._hasLastReferences && this._lastReferences === refs) {
        return;
      }
      this._lastReferences = refs;
      this._hasLastReferences = true;
      this.updateForm(refs || []);
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

  protected updateForm(value: DocReference[]): void {
    this._suppressAuthorFocus = true;
    this._draft.set({
      references: (value || []).map((r) => this.toControls(r)),
    });
    this.form().reset();
  }

  protected getReferences(): DocReference[] {
    return this._draft().references.map((r) => ({
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
      this._lastReferences = next;
      this._hasLastReferences = true;
      this.references.set(next);
    }
  }
}
