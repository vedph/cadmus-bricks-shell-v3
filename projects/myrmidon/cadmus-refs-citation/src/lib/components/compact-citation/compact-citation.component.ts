import { Component, computed, input, model, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { distinctUntilChanged, Subscription } from 'rxjs';

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
    ReactiveFormsModule,
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
})
export class CompactCitationComponent implements OnDestroy {
  private _sub?: Subscription;
  public editedIndex = -1;
  public edited?: Citation;
  public span?: CitationSpan;

  /**
   * The scheme keys to use in this component. The full list of schemes is
   * drawn from the service, but users might want to restrict the list to
   * a subset of schemes.
   */
  public readonly schemeKeys = input<string[]>();

  public readonly abSchemeKeys = computed<string[] | undefined>(() => {
    // when editing B, the only allowed scheme is the one of A
    return this.editedIndex === 1 && this.a()?.schemeId
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

  /**
   * The from portion of the citation span, if any.
   */
  public readonly a = computed<Citation | undefined>(() => {
    if (!this.citation()) {
      return undefined;
    }
    return this.range.value
      ? (this.citation() as CitationSpan).a
      : (this.citation() as Citation);
  });

  /**
   * The to portion of the citation span, if any.
   */
  public readonly b = computed<Citation | undefined>(() => {
    if (!this.citation()) {
      return undefined;
    }
    return (this.citation() as CitationSpan).b;
  });

  public readonly range = new FormControl<boolean>(false, {
    nonNullable: true,
  });

  constructor(private _schemeService: CitSchemeService) {
    this._sub = this.range.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((v) => {
        this.cancel();
        // if the range was set to true, add and edit B if missing
        if (v && !this.b()) {
          this.editB();
        }
        // if the range was set to false, remove B
        if (!v && this.b()) {
          this.citation.set(deepCopy(this.a()!));
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onCitClick(b: boolean): void {
    if (b) {
      this.editB();
    } else {
      this.editA();
    }
  }

  public editA() {
    this.span = { a: this.a(), b: this.b() } as CitationSpan;
    console.log(this.span);
    this.editedIndex = 0;
    this.edited = this.a()
      ? deepCopy(this.a())
      : this._schemeService.createEmptyCitation(this.defaultSchemeId());
  }

  public editB() {
    this.span = { a: this.a(), b: this.b() } as CitationSpan;
    console.log(this.span);
    this.editedIndex = 1;
    this.edited = deepCopy(this.b());
  }

  private saveA(citation?: Citation): void {
    if (!citation) {
      return;
    }
    this.span!.a = citation;
  }

  private saveB(citation?: Citation): void {
    this.span!.b = citation;
  }

  public cancel(): void {
    this.edited = undefined;
    this.editedIndex = -1;
  }

  public saveAB(citation?: Citation): void {
    if (this.editedIndex === 0 && citation) {
      this.saveA(citation);
    } else if (this.editedIndex === 1) {
      this.saveB(citation);
    }
  }

  public save(): void {
    if (this.range.value) {
      this.citation.set(deepCopy(this.span!));
    } else {
      this.citation.set(deepCopy(this.span!.a!));
    }
    this.edited = undefined;
    this.editedIndex = -1;
    this.span = undefined;
  }
}
