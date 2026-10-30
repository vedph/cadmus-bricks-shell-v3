import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import type { RefLookupOptDialogConfig } from '@myrmidon/cadmus-refs-lookup';

import {
  PLEIADES_TOPONYM_SCOPES,
  PleiadesSearchRequest,
  PleiadesSearchScope,
} from '../../models';
import { PleiadesFiltersStore } from '../../services/pleiades-filters-store';
import { PleiadesRefLookupOptions } from '../../services/pleiades-ref-lookup.service';
import { PleiadesQueryComponent } from '../pleiades-query/pleiades-query';

/**
 * The configuration for the dialog hosting PleiadesLookupOptionsComponent
 * in RefLookupComponent (its `optDialogConfig`).
 */
export const PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG: RefLookupOptDialogConfig =
  {
    title: 'Pleiades lookup filters',
    width: '95vw',
    maxWidth: '1400px',
    height: '90vh',
    maxHeight: '90vh',
  };

/**
 * The data received by PleiadesLookupOptionsComponent from the lookup
 * options dialog.
 */
export interface PleiadesLookupOptionsData {
  /** The current lookup options, if any. */
  options?: PleiadesRefLookupOptions;
}

/**
 * The options component for the Pleiades lookup. Set it as the
 * `optDialog` of RefLookupComponent, with
 * PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG as its `optDialogConfig`. This
 * lets users set all the search filters except text, which comes from the
 * lookup, using PleiadesQueryComponent. Users can also save the filters
 * in the local storage, so that the lookup uses them by default.
 * The dialog is closed with the new options when applying them, or with
 * the original options when cancelling.
 */
@Component({
  selector: 'cadmus-pleiades-lookup-options',
  imports: [MatButtonModule, MatIconModule, PleiadesQueryComponent],
  template: `
    <cadmus-pleiades-query
      [hideText]="true"
      [hidePick]="true"
      [canSaveFilters]="true"
      [defaultScopes]="defaultScopes"
      [pageSize]="20"
      [request]="request"
    />
    <div class="actions">
      <button type="button" mat-button (click)="cancel()">cancel</button>
      <button
        type="button"
        mat-flat-button
        [disabled]="query()?.form()?.invalid()"
        (click)="apply()"
      >
        <mat-icon>check_circle</mat-icon>
        apply
      </button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      min-height: 0;
    }
    cadmus-pleiades-query {
      flex: 1 1 auto;
      min-height: 480px;
    }
    .actions {
      flex: 0 0 auto;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesLookupOptionsComponent {
  private readonly _dialogRef = inject(MatDialogRef, { optional: true });
  private readonly _store = inject(PleiadesFiltersStore);
  public readonly data = inject<PleiadesLookupOptionsData | undefined>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  public readonly query = viewChild(PleiadesQueryComponent);

  /**
   * The default scopes, i.e. those of the lookup service.
   */
  public readonly defaultScopes: PleiadesSearchScope[] = [
    ...PLEIADES_TOPONYM_SCOPES,
  ];

  /**
   * The initial request: the filters of the current options, or the saved
   * ones when there are no options.
   */
  public readonly request: PleiadesSearchRequest;

  constructor() {
    const initial: PleiadesRefLookupOptions =
      this.data?.options ?? this._store.load() ?? {};
    const { noTypeAhead, matchAny, ...filters } = initial;
    this.request = { ...filters };
  }

  /**
   * Close the dialog with the current filters as options, keeping the
   * options which are not filters.
   */
  public apply(): void {
    const query = this.query();
    if (!query || query.form().invalid()) {
      return;
    }
    const options: PleiadesRefLookupOptions = { ...query.getFilters() };
    const original = this.data?.options;
    if (original?.noTypeAhead) {
      options.noTypeAhead = true;
    }
    if (original?.matchAny) {
      options.matchAny = true;
    }
    this._dialogRef?.close(options);
  }

  /**
   * Close the dialog with the original options.
   */
  public cancel(): void {
    this._dialogRef?.close(this.data?.options);
  }
}
