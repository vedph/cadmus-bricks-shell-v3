import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

import { RefLookupComponent } from '../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import { ViafRefLookupService } from '../../projects/myrmidon/cadmus-refs-viaf-lookup/src/public-api';
import { GeoNamesRefLookupService } from '../../projects/myrmidon/cadmus-refs-geonames-lookup/src/public-api';
import { WhgRefLookupService } from '../../projects/myrmidon/cadmus-refs-whg-lookup/src/lib/services/whg-ref-lookup.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        MatButtonModule,
        MatDividerModule,
        MatMenuModule,
        MatToolbarModule,
        RefLookupComponent,
      ],
      providers: [
        ViafRefLookupService,
        GeoNamesRefLookupService,
        WhgRefLookupService,
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
