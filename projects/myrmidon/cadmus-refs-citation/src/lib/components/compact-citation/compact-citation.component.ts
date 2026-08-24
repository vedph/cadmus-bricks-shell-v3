import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  signal,
  untracked,
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

  // A, B and the range flag are the bound citation projected into three
  // writable pieces: derived from `citation`, but edited in place while the
  // user works on them. The projection is lossless in both directions
  // (see save() below), so an echo of our own save simply re-derives the
  // same values - no echo bookkeeping needed.
  public readonly a = linkedSignal<
    Citation | CitationSpan | undefined,
    Citation | undefined
  >({
    source: () => this.citation(),
    computation: (citation) =>
      !citation
        ? undefined
        : (citation as CitationSpan).a
          ? (citation as CitationSpan).a
          : (citation as Citation),
  });

  public readonly b = linkedSignal<
    Citation | CitationSpan | undefined,
    Citation | undefined
  >({
    source: () => this.citation(),
    computation: (citation) =>
      citation && (citation as CitationSpan).a
        ? (citation as CitationSpan).b
        : undefined,
  });

  private readonly _rangeDraft = linkedSignal<
    Citation | CitationSpan | undefined,
    { range: boolean }
  >({
    source: () => this.citation(),
    computation: (citation) => ({
      range: !!citation && !!(citation as CitationSpan).a,
    }),
  });

  public readonly form: FieldTree<{ range: boolean }>;

  constructor(private _schemeService: CitSchemeService) {
    this.form = form(this._rangeDraft);

    // re-check the projected pair whenever a citation is bound (an empty
    // citation reports no error until the user does something)
    effect(() => {
      const citation = this.citation();
      untracked(() => {
        if (citation) {
          this.validate();
        }
      });
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
    this.citation.set(
      this.form.range().value()
        ? deepCopy({ a: this.a(), b: this.b() })
        : deepCopy(this.a()),
    );
  }
}
