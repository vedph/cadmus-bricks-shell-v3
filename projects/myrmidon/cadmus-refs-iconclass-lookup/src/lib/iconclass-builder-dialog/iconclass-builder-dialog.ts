import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, switchMap, timeout } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { RefLookupMoreDialogData } from '@myrmidon/cadmus-refs-lookup';
import {
  IcoLookupSort,
  IconclassService as IconclassApiService,
} from '@myrmidon/iconclass-api';
import {
  IconclassBuilder,
  IconclassBuilderResult,
} from '@myrmidon/iconclass-builder';

import { IconclassNotation } from '../iconclass.service';
import { IconclassRefLookupService } from '../iconclass-lookup.service';
import { iconclassBuilderResultToNotation } from '../iconclass-builder-helpers';

/**
 * The data for IconclassBuilderDialogComponent. When the dialog is opened
 * by the More button of the lookup, `title`, `item` and `options` are set
 * by the lookup, while the other properties come from the `data` of its
 * `moreDialogConfig`.
 */
export interface IconclassBuilderDialogData extends RefLookupMoreDialogData {
  /** The dialog title (default "Iconclass"). */
  title?: string;
  /**
   * The current item: when set, the builder starts from its identifier.
   */
  item?: IconclassNotation;
  /** The identifier to start from, overriding the item's one. */
  id?: string;
  /** The initial builder language (default "en"). */
  language?: string;
  /** The initial lookup sort order. */
  sort?: IcoLookupSort;
  /** True to extend lookups via the keyword thesaurus. */
  expandRefs?: boolean;
  /** True to show the Wikidata labels of `wd:Q...` values. */
  wikidata?: boolean;
  /** The initial page size of lookup results. */
  pageSize?: number;
  /** The debounce time for typing in lookups, in milliseconds. */
  debounceMs?: number;
  /**
   * True to never get the notation from the public ICONCLASS API, always
   * building it from the builder result (see
   * iconclassBuilderResultToNotation).
   */
  noResolve?: boolean;
  /**
   * The timeout in milliseconds for getting the notation from the public
   * ICONCLASS API (default 15000), after which the notation is built from
   * the builder result.
   */
  resolveTimeout?: number;
}

/**
 * A dialog wrapping the Iconclass builder, closed with the notation built
 * by the user, or with undefined when cancelled. The notation has the same
 * shape of the items of IconclassRefLookupService: it is got from the
 * public ICONCLASS API like those items, or, when this fails, built from
 * the builder result. Use it as the `moreDialog` of the ICONCLASS lookup,
 * with ICONCLASS_BUILDER_DIALOG_CONFIG as its `moreDialogConfig`.
 */
@Component({
  selector: 'cadmus-iconclass-builder-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    IconclassBuilder,
  ],
  template: `
    <div class="header">
      <h2 mat-dialog-title>{{ data?.title || 'Iconclass' }}</h2>
      <button
        type="button"
        mat-icon-button
        mat-dialog-close
        matTooltip="Close without picking"
        aria-label="close"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content>
      @if (resolving()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <iconclass-builder
        [id]="initialId"
        [language]="data?.language || 'en'"
        [sort]="data?.sort || 'Hierarchy'"
        [expandRefs]="!!data?.expandRefs"
        [wikidata]="!!data?.wikidata"
        [pageSize]="data?.pageSize || 20"
        [debounceMs]="data?.debounceMs ?? 300"
        [hasAccept]="true"
        [class.resolving]="resolving()"
        (idAccept)="accept($event)"
      />
    </mat-dialog-content>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .header {
      display: flex;
      align-items: center;
      padding-right: 8px;
    }
    .header h2 {
      flex: 1 1 auto;
    }
    mat-dialog-content {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      max-height: none;
      min-height: 0;
    }
    iconclass-builder {
      flex: 1 1 auto;
      min-height: 0;
    }
    iconclass-builder.resolving {
      pointer-events: none;
      opacity: 0.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconclassBuilderDialogComponent {
  private readonly _dialogRef = inject(
    MatDialogRef<IconclassBuilderDialogComponent, IconclassNotation>,
  );
  private readonly _lookup = inject(IconclassRefLookupService);
  private readonly _api = inject(IconclassApiService);
  private readonly _destroyRef = inject(DestroyRef);

  public readonly data = inject<IconclassBuilderDialogData | undefined>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  /**
   * The identifier the builder starts from.
   */
  public readonly initialId = this.data?.id || this.data?.item?.n || '';

  /**
   * True while getting the notation for the accepted identifier.
   */
  public readonly resolving = signal(false);

  /**
   * Get the notation for the builder result, from the public ICONCLASS
   * API, or, when not available, from the result itself.
   * @param result The builder result.
   * @returns The notation.
   */
  private resolve(result: IconclassBuilderResult): Observable<IconclassNotation> {
    // the notation from the builder result, with its English text when
    // the builder language is not English (labels are usually got from
    // the English text, e.g. by itemLabelGetter)
    const fallback$: Observable<IconclassNotation> =
      result.language === 'en'
        ? of(iconclassBuilderResultToNotation(result))
        : this._api.parse(result.id, 'en').pipe(
            map((parsed) =>
              iconclassBuilderResultToNotation(result, parsed.text),
            ),
            catchError(() => of(iconclassBuilderResultToNotation(result))),
          );

    if (this.data?.noResolve) {
      return fallback$;
    }
    return this._lookup.getById(result.id).pipe(
      timeout(this.data?.resolveTimeout || 15000),
      catchError((error) => {
        console.warn('Iconclass notation not got for ' + result.id, error);
        return of(undefined);
      }),
      switchMap((notation) => (notation?.n ? of(notation) : fallback$)),
    );
  }

  /**
   * Accept the identifier built by the user, closing the dialog with the
   * corresponding notation.
   * @param result The builder result.
   */
  public accept(result: IconclassBuilderResult): void {
    if (this.resolving() || !result?.id) {
      return;
    }
    this.resolving.set(true);
    this.resolve(result)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((notation) => {
        this.resolving.set(false);
        this._dialogRef.close(notation);
      });
  }
}
