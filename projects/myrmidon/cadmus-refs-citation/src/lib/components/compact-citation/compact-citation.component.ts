import {
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Citation, CitationSpan } from '../../models';
import { CitationViewComponent } from '../citation-view/citation-view.component';
import { CitationComponent } from '../citation/citation.component';

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
  private _rangeChangeFrozen?: boolean;

  /**
   * The scheme keys to use in this component. The full list of schemes is
   * drawn from the service, but users might want to restrict the list to
   * a subset of schemes.
   */
  public readonly schemeKeys = input<string[]>();

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

  public editorExpanded?: boolean;
  public readonly range = new FormControl<boolean>(false, {
    nonNullable: true,
  });

  constructor() {
    this._sub = this.range.valueChanges.subscribe((value) => {
      this._rangeChangeFrozen = true;
      if (value) {
        this.citation.set({
          a: this.a(),
          b: this.b(),
        } as CitationSpan);
      } else {
        this.citation.set(this.a() as Citation);
      }
    });
    effect(() => {
      if (this._rangeChangeFrozen) {
        this._rangeChangeFrozen = false;
        return;
      }
      this.range.setValue(this.citation()?.hasOwnProperty('b') === true);
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onAChange(citation?: Citation): void {
    if (!citation) {
      return;
    }
    if (this.range.value) {
      const span: CitationSpan = this.citation() as CitationSpan;
      span.a = citation!;
      this.citation.set(span);
    } else {
      this.citation.set(citation!);
    }
  }

  public onBChange(citation?: Citation): void {
    if (this.range.value) {
      const span: CitationSpan = this.citation() as CitationSpan;
      span.b = citation;
      this.citation.set(span);
    }
  }
}
