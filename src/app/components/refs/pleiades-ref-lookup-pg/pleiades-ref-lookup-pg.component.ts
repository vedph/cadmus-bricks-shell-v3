import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';

import {
  LookupProviderOptions,
  RefLookupComponent,
} from '@myrmidon/cadmus-refs-lookup';
import {
  PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG,
  PleiadesFiltersStore,
  PleiadesLookupOptionsComponent,
  PleiadesQueryDialogComponent,
  PleiadesQueryDialogData,
  PleiadesRefLookupOptions,
  PleiadesRefLookupService,
  PleiadesSearchResult,
} from '@myrmidon/cadmus-refs-pleiades-lookup';

@Component({
  selector: 'app-pleiades-ref-lookup-pg',
  imports: [JsonPipe, MatButtonModule, MatCardModule, RefLookupComponent],
  templateUrl: './pleiades-ref-lookup-pg.component.html',
  styleUrl: './pleiades-ref-lookup-pg.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesRefLookupPgComponent {
  private readonly _dialog = inject(MatDialog);
  private readonly _store = inject(PleiadesFiltersStore);

  public readonly service = inject(PleiadesRefLookupService);
  public readonly item = signal<PleiadesSearchResult | undefined>(undefined);

  /**
   * The options component, letting users set all the search filters
   * except text, and its dialog configuration.
   */
  public readonly optDialog = PleiadesLookupOptionsComponent;
  public readonly optDialogConfig = PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG;

  /**
   * The current lookup options, set by the options dialog or by scopes.
   */
  public readonly options = signal<PleiadesRefLookupOptions | undefined>(
    undefined,
  );

  /**
   * The filters saved by the user, used when there are no options.
   */
  public readonly savedFilters = signal(this._store.load());

  /**
   * Sample scopes for the lookup: the default (toponyms of any type), or
   * only some place types.
   */
  public readonly providerOptions: LookupProviderOptions = {
    pleiades: {
      default: null,
      settlements: {
        label: 'settlements',
        options: { placeTypes: ['settlement'] },
      },
      water: {
        label: 'rivers and lakes',
        options: { placeTypes: ['river', 'lake'] },
      },
      reliable: {
        label: 'reliable names',
        options: { rankMin: 90 },
      },
    },
  };

  public refreshSavedFilters(): void {
    this.savedFilters.set(this._store.load());
  }

  public clearSavedFilters(): void {
    this._store.clear();
    this.refreshSavedFilters();
  }

  public onItemChange(item: unknown): void {
    this.item.set(item as PleiadesSearchResult | undefined);
  }

  /**
   * Open the full query in a dialog, starting from the current item's
   * name, and pick the place chosen there.
   */
  public onMoreRequest(): void {
    const name = this.item()?.name;
    this._dialog
      .open<
        PleiadesQueryDialogComponent,
        PleiadesQueryDialogData,
        PleiadesSearchResult
      >(PleiadesQueryDialogComponent, {
        width: '95vw',
        maxWidth: '1600px',
        height: '90vh',
        maxHeight: '90vh',
        data: {
          title: 'Pleiades search',
          request: name
            ? { text: name, scopes: ['plttl', 'nmrmz', 'nmatt'] }
            : undefined,
          autoSearch: !!name,
        },
      })
      .afterClosed()
      .subscribe((place) => {
        if (place) {
          this.item.set(place);
        }
      });
  }
}
