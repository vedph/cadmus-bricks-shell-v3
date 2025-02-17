import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideNoopAnimations } from '@angular/platform-browser/animations';

import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitMappedValues,
  CitSchemeService,
  CitSchemeSet,
  MapFormatter,
} from '../../../../../projects/myrmidon/cadmus-refs-citation/src/public-api';

import { DC_SCHEME, OD_SCHEME } from '../../../cit-schemes';
import { CitationPgComponent } from './citation-pg.component';

describe('CitationPgComponent', () => {
  let component: CitationPgComponent;
  let fixture: ComponentFixture<CitationPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationPgComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: CIT_SCHEME_SERVICE_TOKEN,
          useFactory: () => {
            const service = new CitSchemeService();
            service.configure({
              formats: {},
              schemes: {
                dc: DC_SCHEME,
                od: OD_SCHEME,
              },
            } as CitSchemeSet);
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
            service.addFormatter('agl', aglFormatter);

            return service;
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CitationPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
