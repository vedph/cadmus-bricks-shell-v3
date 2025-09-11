import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';

import { WebColorLookup } from '../ref-lookup-pg/ref-lookup-pg.component';
import {
  RefLookupConfig,
  RefLookupSetComponent,
} from '@myrmidon/cadmus-refs-lookup';
import { ViafRefLookupService } from '@myrmidon/cadmus-refs-viaf-lookup';

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
