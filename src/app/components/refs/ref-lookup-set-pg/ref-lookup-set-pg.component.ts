import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';

import { WebColorLookup } from '../ref-lookup-pg/ref-lookup-pg.component';
import {
  RefLookupConfig,
  RefLookupSetComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import { ViafRefLookupService } from '../../../../../projects/myrmidon/cadmus-refs-viaf-lookup/src/public-api';

@Component({
  selector: 'app-ref-lookup-set-pg',
  templateUrl: './ref-lookup-set-pg.component.html',
  styleUrls: ['./ref-lookup-set-pg.component.css'],
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

  constructor(viafService: ViafRefLookupService) {
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
