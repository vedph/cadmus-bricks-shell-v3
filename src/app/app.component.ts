import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

import { EnvService, RamStorageService } from '@myrmidon/ngx-tools';

import { RefLookupConfig } from '../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import { ViafRefLookupService } from '../../projects/myrmidon/cadmus-refs-viaf-lookup/src/public-api';
import { ASSERTED_COMPOSITE_ID_CONFIGS_KEY } from '../../projects/myrmidon/cadmus-refs-asserted-ids/src/public-api';
import { GeoNamesRefLookupService } from '../../projects/myrmidon/cadmus-refs-geonames-lookup/src/public-api';
import {
  GeoJsonFeature,
  WhgRefLookupService,
} from '../../projects/myrmidon/cadmus-refs-whg-lookup/src/public-api';
import { WebColorLookup } from './components/refs/ref-lookup-pg/ref-lookup-pg.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatToolbarModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public version: string;

  constructor(
    env: EnvService,
    storage: RamStorageService,
    viaf: ViafRefLookupService,
    geonames: GeoNamesRefLookupService,
    whg: WhgRefLookupService
  ) {
    this.version = env.get('version') || '';
    // configure external lookup for asserted composite IDs
    storage.store(ASSERTED_COMPOSITE_ID_CONFIGS_KEY, [
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
        service: viaf,
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.term,
      },
      {
        name: 'geonames',
        iconUrl: '/img/geonames128.png',
        description: 'GeoNames',
        label: 'ID',
        service: geonames,
        itemIdGetter: (item: any) => item?.geonameId,
        itemLabelGetter: (item: any) => item?.name,
      },
      {
        name: 'whg',
        iconUrl: '/img/whg128.png',
        description: 'World Historical Gazetteer',
        label: 'ID',
        service: whg,
        itemIdGetter: (item: GeoJsonFeature) => item?.properties.place_id,
        itemLabelGetter: (item: GeoJsonFeature) => item?.properties.title,
      },
    ] as RefLookupConfig[]);
  }
}
