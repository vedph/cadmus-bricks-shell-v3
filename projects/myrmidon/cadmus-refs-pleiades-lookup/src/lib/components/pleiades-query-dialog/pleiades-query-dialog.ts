import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import {
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
  /** True to search the initial request when opening the dialog. */
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
 * A dialog wrapping PleiadesQueryComponent, closed with the place picked
 * by the user, or with undefined when cancelled. Open it with a large
 * size, e.g. `{ width: '95vw', maxWidth: '1600px', height: '90vh' }`.
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
        [request]="data?.request"
        [autoSearch]="!!data?.autoSearch"
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

  public pick(place: PleiadesSearchResult): void {
    this._dialogRef.close(place);
  }
}
