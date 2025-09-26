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
} from '@myrmidon/cadmus-refs-lookup';
import { ViafRefLookupService } from '@myrmidon/cadmus-refs-viaf-lookup';
import { GeoNamesRefLookupService } from '@myrmidon/cadmus-refs-geonames-lookup';
import {
  GeoJsonFeature,
  WhgRefLookupService,
} from '@myrmidon/cadmus-refs-whg-lookup';
import {
  CIT_SCHEME_SERVICE_SETTINGS_KEY,
  CitMappedValues,
  CitSchemeSettings,
  MapFormatter,
} from '@myrmidon/cadmus-refs-citation';

// local
import { WebColorLookup } from './components/refs/ref-lookup-pg/ref-lookup-pg.component';
import { DC_SCHEME, OD_SCHEME } from './cit-schemes';
import { ZoteroRefLookupService } from '@myrmidon/cadmus-refs-zotero-lookup';

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
      // Zotero
      {
        name: 'Zotero',
        iconUrl: '/img/zotero128.png',
        description: 'Zotero bibliography',
        label: 'ID',
        service: inject(ZoteroRefLookupService),
        itemIdGetter: (item: any) =>
          // use a global ID by concatenating library ID and item key
          item ? `${item.library?.id}/${item.key}` : '',
        itemLabelGetter: (item: any) => {
          // customize this as you prefer
          if (!item) {
            return '';
          }
          const sb: string[] = [];
          if (item.data?.creators && Array.isArray(item.data.creators)) {
            const creators = item.data.creators;
            for (let i = 0; i < creators.length; i++) {
              const c = creators[i];
              if (i > 0) {
                sb.push('; ');
              }
              if (c.lastName) {
                sb.push(c.lastName);
              }
              if (c.firstName) {
                sb.push(' ' + c.firstName.charAt(0) + '.');
              }
            }
          }
          sb.push(': ');
          if (item.title) {
            sb.push(item.title);
          } else if (item.data?.title) {
            sb.push(item.data?.title);
          }
          return sb.join('');
        },
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
