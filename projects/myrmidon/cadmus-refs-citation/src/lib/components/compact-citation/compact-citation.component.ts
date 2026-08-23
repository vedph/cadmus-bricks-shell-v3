import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { deepCopy } from '@myrmidon/ngx-tools';

import { Citation, CitationSpan } from '../../models';
import { CitationViewComponent } from '../citation-view/citation-view.component';
import { CitationComponent } from '../citation/citation.component';
import { CitSchemeService } from '../../services/cit-scheme.service';

/**
 * Compact citation component.
 * This component is used to display a citation or citation span in a compact
 * form, and edit it in a citation editor for a single citation, or in two
 * citation editors for a range of citations.
 */
@Component({
  selector: 'cadmus-refs-compact-citation',
  imports: [
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    CitationViewComponent,
    CitationComponent,
  ],
  templateUrl: './compact-citation.component.html',
  styleUrl: './compact-citation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompactCitationComponent {
  private _dropNextUpdate = false;
  // set synchronously at the point save() writes `citation` (not inside the
  // effect below), paired with _hasLastCitation since undefined is both
  // "never saved yet" and a legitimate real value - see
  // signal-forms-migration.md
  private _lastCitation: Citation | CitationSpan | undefined = undefined;
  private _hasLastCitation = false;

  /**
   * The scheme keys to use in this component. The full list of schemes is
   * drawn from the service, but users might want to restrict the list to
   * a subset of schemes.
   */
  public readonly schemeKeys = input<string[]>();

  public readonly abSchemeKeys = computed<string[] | undefined>(() => {
    // when editing B, the only allowed scheme is the one of A
    return this.editedIndex() === 1 && this.a()?.schemeId
      ? [this.a()!.schemeId]
      : this.schemeKeys();
  });

  /**
   * True if the component allows free mode, where the user can type the
   * citation as a free text, using the scheme parser.
   */
  public readonly allowFreeMode = input<boolean>();

  /**
   * True if the component allows a partial citation, i.e. a citation
   * missing the final step(s) starting from the first one defined as
   * optional in the scheme.
   */
  public readonly allowPartial = input<boolean>();

  /**
   * The citation or citation span to edit.
   */
  public readonly citation = model<Citation | CitationSpan>();

  /**
   * The default scheme ID to use when no scheme is specified.
   */
  public readonly defaultSchemeId = computed<string>(() => {
    if (!this.citation()) {
      return '';
    }
    // if it's a span, use its a's scheme ID
    if ((this.citation() as CitationSpan).a) {
      return (this.citation() as CitationSpan).a.schemeId;
    }
    // if it's a citation, use its scheme ID
    return (this.citation() as Citation).schemeId;
  });

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<Citation | undefined>(undefined);
  public readonly formError = signal<string | undefined>(undefined);

  public readonly a = signal<Citation | undefined>(undefined);
  public readonly b = signal<Citation | undefined>(undefined);

  private readonly _rangeDraft = signal({ range: false });
  public readonly form: FieldTree<{ range: boolean }>;

  constructor(private _schemeService: CitSchemeService) {
    this.form = form(this._rangeDraft);

    // when citation changes, update the form. Two distinct guards are
    // needed here, both keyed on the same _lastCitation/_hasLastCitation
    // pair: (1) this effect can be re-invoked with an unchanged (reference-
    // equal) *external* citation value - e.g. interleaved with other signal
    // writes in the same view - so it records what it last actually
    // processed itself; (2) save() ALSO records the value it writes,
    // synchronously, at the point of writing - so an effect run that is
    // just an echo of our own save (deferred, and possibly running after
    // further local edits) is recognized and skipped too. Skipping either
    // way is correct: re-deriving a/b/range from a stale citation would
    // stomp a subsequent interactive change to range.
    effect(() => {
      const c = this.citation();
      if (this._hasLastCitation && this._lastCitation === c) {
        return;
      }
      this._lastCitation = c;
      this._hasLastCitation = true;

      if (this._dropNextUpdate) {
        this._dropNextUpdate = false;
        return;
      }
      this.updateAB(c);
    });
  }

  public onRangeToggle(v: boolean): void {
    this.form.range().value.set(v);
    this.closeCitation();

    // if the range was set to true, add and edit B if missing
    if (v && !this.b()) {
      this.b.set(deepCopy(this.a()));
      this.editB();
    }
    // if the range was set to false, remove B and save
    if (!v && this.b()) {
      this.b.set(undefined);
      this.save();
    }
  }

  public onCitClick(b: boolean): void {
    if (b) {
      this.editB();
    } else {
      this.editA();
    }
  }

  private updateAB(citation?: Citation | CitationSpan) {
    if (!citation) {
      this._rangeDraft.set({ range: false });
      this.a.set(undefined);
      this.b.set(undefined);
      return;
    }

    const span = citation as CitationSpan;
    const isSpan = !!span.a;
    this.a.set(isSpan ? (span as CitationSpan).a : (citation as Citation));
    this.b.set(isSpan ? (span as CitationSpan).b : undefined);
    this._rangeDraft.set({ range: isSpan });

    this.validate();
  }

  public editA() {
    this.editedIndex.set(0);
    this.edited.set(
      this.a()
        ? deepCopy(this.a())
        : this._schemeService.createEmptyCitation(this.defaultSchemeId())
    );
  }

  public editB() {
    this.edited.set(deepCopy(this.b()));
    this.editedIndex.set(1);
  }

  private validate(): boolean {
    if (this.form.range().value()) {
      // in range mode, A must be set and B must be after A
      if (!this.a() || !this.b()) {
        this.formError.set('A and B are required');
        return false;
      }
      const compResult = this._schemeService.compareCitations(
        this.a(),
        this.b()
      );
      // A must come before B
      if (compResult >= 0) {
        this.formError.set('B must come after A');
        return false;
      }
    } else {
      // in single mode, A is required
      if (!this.a()) {
        this.formError.set('citation required');
        return false;
      }
    }
    this.formError.set(undefined);
    return true;
  }

  public closeCitation(): void {
    this.edited.set(undefined);
    this.editedIndex.set(-1);
  }

  public onCitationChange(citation?: Citation): void {
    if (this.editedIndex() === 0) {
      this.a.set(citation);
      if (!citation) {
        this.b.set(undefined);
      }
    } else if (this.editedIndex() === 1) {
      this.b.set(citation);
    }
    if (!this.validate()) {
      return;
    }
    this.closeCitation();
    this.save();
  }

  private save(): void {
    const next = this.form.range().value()
      ? deepCopy({ a: this.a(), b: this.b() })
      : deepCopy(this.a());
    this._lastCitation = next;
    this._hasLastCitation = true;
    this.citation.set(next);
  }
}
