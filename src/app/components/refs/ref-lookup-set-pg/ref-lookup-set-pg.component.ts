import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';

import { WebColorLookup } from '../ref-lookup-pg/ref-lookup-pg.component';
import {
  RefLookupConfig,
  RefLookupSetComponent,
} from '@myrmidon/cadmus-refs-lookup';
import { ViafRefLookupService } from '@myrmidon/cadmus-refs-viaf-lookup';
import { BiblissimaRefLookupService } from '@myrmidon/cadmus-refs-biblissima-lookup';
import {
  PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG,
  PleiadesLookupOptionsComponent,
  PleiadesRefLookupService,
  PleiadesSearchResult,
} from '@myrmidon/cadmus-refs-pleiades-lookup';

@Component({
  selector: 'app-ref-lookup-set-pg',
  templateUrl: './ref-lookup-set-pg.component.html',
  styleUrls: ['./ref-lookup-set-pg.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    RefLookupSetComponent,
  ],
})
export class RefLookupSetPgComponent implements OnDestroy {
  private _sub?: Subscription;
  public readonly item = signal<any>(undefined);
  public readonly configs: RefLookupConfig[];

  constructor(
    viafService: ViafRefLookupService,
    biblissimaService: BiblissimaRefLookupService,
    pleiadesService: PleiadesRefLookupService,
  ) {
    this.configs = [
      {
        name: 'colors',
        iconUrl: '/img/colors128.png',
        description: 'Colors',
        label: 'color',
        service: new WebColorLookup(),
        itemIdGetter: (item: any) => item?.value,
        itemLabelGetter: (item: any) => item?.name,
      },
      {
        name: 'VIAF',
        iconUrl: '/img/viaf128.png',
        description: 'Virtual International Authority File',
        label: 'ID',
        service: viafService,
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.term,
      },
      {
        name: 'Biblissima+',
        iconUrl: '/img/biblissima128.png',
        description: 'Biblissima+ knowledge base',
        label: 'ID',
        service: biblissimaService,
        itemIdGetter: (item: any) => item?.id,
        itemLabelGetter: (item: any) => item?.name,
      },
      {
        name: 'Pleiades',
        iconUrl: '/img/pleiades128.png',
        description: 'Pleiades gazetteer of ancient places',
        label: 'ID',
        service: pleiadesService,
        itemIdGetter: (item: PleiadesSearchResult) => item?.id,
        itemLabelGetter: (item: PleiadesSearchResult) => item?.name,
        optDialog: PleiadesLookupOptionsComponent,
        optDialogConfig: PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG,
      },
    ];
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onItemChange(event: any): void {
    this.item.set(event.item);
  }

  public onMoreRequest(event: any): void {
    console.log('MORE REQUEST');
  }
}
