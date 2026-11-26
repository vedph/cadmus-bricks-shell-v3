import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import type { RefLookupMoreDialogConfig } from '@myrmidon/cadmus-refs-lookup';

import {
  PLEIADES_TOPONYM_SCOPES,
  PleiadesLngLat,
  PleiadesSearchRequest,
  PleiadesSearchResult,
  PleiadesSearchScope,
} from '../../models';
import { PLEIADES_DEFAULT_MAP_STYLE } from '../pleiades-map/pleiades-map';
import { PleiadesQueryComponent } from '../pleiades-query/pleiades-query';

/**
 * The data for PleiadesQueryDialogComponent.
 */
export interface PleiadesQueryDialogData {
  /** The dialog title (default "Pleiades"). */
  title?: string;
  /** The initial request. */
  request?: PleiadesSearchRequest;
  /**
   * The current place, e.g. the item of the lookup when this dialog is its
   * `moreDialog`. When there is no request, the initial request searches
   * the toponyms for this place's name.
   */
  item?: PleiadesSearchResult;
  /**
   * True to search the initial request when opening the dialog. When not
   * set, this is true when the request comes from the item.
   */
  autoSearch?: boolean;
  /** The map style URL. */
  mapStyle?: string;
  /** The initial map center. */
  initialCenter?: PleiadesLngLat;
  /** The initial map zoom. */
  initialZoom?: number;
  /** The default page size. */
  pageSize?: number;
  /** The default scopes. */
  defaultScopes?: PleiadesSearchScope[];
}

/**
 * The default configuration of the Pleiades query dialog, used as the
 * `moreDialogConfig` of the Pleiades lookup.
 */
export const PLEIADES_QUERY_DIALOG_CONFIG: RefLookupMoreDialogConfig = {
  title: 'Pleiades search',
  width: '95vw',
  maxWidth: '1600px',
  height: '90vh',
  maxHeight: '90vh',
};

/**
 * A dialog wrapping PleiadesQueryComponent, closed with the place picked
 * by the user, or with undefined when cancelled. Open it with a large
 * size, e.g. `{ width: '95vw', maxWidth: '1600px', height: '90vh' }`
 * (see PLEIADES_QUERY_DIALOG_CONFIG). It can be the `moreDialog` of the
 * Pleiades lookup, as it starts from the current item's name.
 */
@Component({
  selector: 'cadmus-pleiades-query-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, PleiadesQueryComponent],
  template: `
    <div class="header">
      <h2 mat-dialog-title>{{ data?.title || 'Pleiades' }}</h2>
      <button
        type="button"
        mat-icon-button
        mat-dialog-close
        aria-label="close"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content>
      <cadmus-pleiades-query
        [request]="request"
        [autoSearch]="autoSearch"
        [mapStyle]="data?.mapStyle || defaultMapStyle"
        [initialCenter]="data?.initialCenter || [22, 39]"
        [initialZoom]="data?.initialZoom ?? 4"
        [pageSize]="data?.pageSize || 50"
        [defaultScopes]="data?.defaultScopes || []"
        (placePick)="pick($event)"
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
    cadmus-pleiades-query {
      flex: 1 1 auto;
      min-height: 480px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesQueryDialogComponent {
  private readonly _dialogRef = inject(
    MatDialogRef<PleiadesQueryDialogComponent, PleiadesSearchResult>,
  );
  public readonly data = inject<PleiadesQueryDialogData | undefined>(
    MAT_DIALOG_DATA,
    { optional: true },
  );
  public readonly defaultMapStyle = PLEIADES_DEFAULT_MAP_STYLE;

  /**
   * The initial request: the one from data, or a toponyms search for the
   * item's name.
   */
  public readonly request: PleiadesSearchRequest | undefined =
    this.data?.request ??
    (this.data?.item?.name
      ? { text: this.data.item.name, scopes: [...PLEIADES_TOPONYM_SCOPES] }
      : undefined);

  /**
   * True to search the initial request when opening the dialog.
   */
  public readonly autoSearch: boolean =
    this.data?.autoSearch ?? (!this.data?.request && !!this.request);

  public pick(place: PleiadesSearchResult): void {
    this._dialogRef.close(place);
  }
}
