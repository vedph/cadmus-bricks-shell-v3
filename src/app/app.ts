import { Component, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

// myrmidon
import { EnvService, RamStorageService } from '@myrmidon/ngx-tools';

// bricks
import {
  LOOKUP_CONFIGS_KEY,
  RefLookupConfig,
} from '../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import { ViafRefLookupService } from '../../projects/myrmidon/cadmus-refs-viaf-lookup/src/public-api';
import { GeoNamesRefLookupService } from '../../projects/myrmidon/cadmus-refs-geonames-lookup/src/public-api';
import {
  GeoJsonFeature,
  WhgRefLookupService,
} from '../../projects/myrmidon/cadmus-refs-whg-lookup/src/public-api';
import {
  CIT_SCHEME_SERVICE_SETTINGS_KEY,
  CitMappedValues,
  CitSchemeSettings,
  MapFormatter,
} from '../../projects/myrmidon/cadmus-refs-citation/src/public-api';

// local
import { WebColorLookup } from './components/refs/ref-lookup-pg/ref-lookup-pg.component';
import { DC_SCHEME, OD_SCHEME } from './cit-schemes';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatDividerModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  public readonly version: string;

  constructor(env: EnvService, storage: RamStorageService) {
    this.version = env.get('version') || '';

    // configure external lookup for asserted composite IDs
    this.configureLookup(storage);

    // configure citation service
    this.configureCitationService(storage);
  }

  private configureLookup(storage: RamStorageService): void {
    storage.store(LOOKUP_CONFIGS_KEY, [
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
        service: inject(ViafRefLookupService),
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.term,
      },
      {
        name: 'geonames',
        iconUrl: '/img/geonames128.png',
        description: 'GeoNames',
        label: 'ID',
        service: inject(GeoNamesRefLookupService),
        itemIdGetter: (item: any) => item?.geonameId,
        itemLabelGetter: (item: any) => item?.name,
      },
      {
        name: 'whg',
        iconUrl: '/img/whg128.png',
        description: 'World Historical Gazetteer',
        label: 'ID',
        service: inject(WhgRefLookupService),
        itemIdGetter: (item: GeoJsonFeature) => item?.properties.place_id,
        itemLabelGetter: (item: GeoJsonFeature) => item?.properties.title,
      },
    ] as RefLookupConfig[]);
  }

  private configureCitationService(storage: RamStorageService): void {
    // agl formatter for Odyssey
    const aglFormatter = new MapFormatter();
    const aglMap: CitMappedValues = {};
    for (let n = 0x3b1; n <= 0x3c9; n++) {
      // skip final sigma
      if (n === 0x3c2) {
        continue;
      }
      aglMap[String.fromCharCode(n)] = n - 0x3b0;
    }
    aglFormatter.configure(aglMap);

    storage.store(CIT_SCHEME_SERVICE_SETTINGS_KEY, {
      formats: {},
      schemes: {
        dc: DC_SCHEME,
        od: OD_SCHEME,
      },
      formatters: {
        agl: aglFormatter,
      },
    } as CitSchemeSettings);
  }
}
