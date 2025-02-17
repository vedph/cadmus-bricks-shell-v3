import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitationComponent,
} from './citation.component';
import { CitScheme, CitSchemeSet, CitMappedValues } from '../../models';
import {
  CIT_FORMATTER_ROMAN_UPPER,
  CitSchemeService,
} from '../../services/cit-scheme.service';
import { MapFormatter } from '../../services/map.formatter';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

//#region Schemes
const OD_SCHEME: CitScheme = {
  id: 'od',
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
    hint: 'book (α-ω) verse (1-N[a-z])',
  },
  color: '#4287f5',
  steps: {
    book: {
      numeric: true,
      color: '#4287f5',
      format: 'agl',
      value: {
        range: {
          min: 1,
          max: 24,
        },
      },
    },
    verse: {
      numeric: true,
      color: '#1ECBE1',
      suffixPattern: '([a-z])$',
      suffixValidPattern: '^[a-z]$',
      value: {
        range: {
          min: 1,
        },
      },
    },
  },
};

const DC_SCHEME: CitScheme = {
  id: 'dc',
  name: 'Commedia',
  path: ['cantica', 'canto', 'verso'],
  optionalFrom: 'canto',
  textOptions: {
    pathPattern: '^\\s*(If\\.|Purg\\.|Par\\.)\\s*([IVX]+)\\s+(\\d+)\\s*$',
    template: '{cantica} {canto} {verso}',
    hint: 'cantica (If., Purg., Par.) canto (1-33) verso (1-N)',
  },
  color: '#BB4142',
  steps: {
    cantica: {
      color: '#BB4142',
      value: {
        set: ['If.', 'Purg.', 'Par.'],
      },
    },
    canto: {
      color: '#7EC8B1',
      numeric: true,
      format: CIT_FORMATTER_ROMAN_UPPER,
      conditions: [
        {
          ascendants: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
          ],
          value: {
            range: {
              min: 1,
              max: 34,
            },
          },
        },
      ],
      value: {
        range: {
          min: 1,
          max: 33,
        },
      },
    },
    verso: {
      color: '#EFE6CC',
      numeric: true,
      conditions: [
        {
          ascendants: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
            {
              id: 'canto',
              op: '==',
              value: '26',
            },
          ],
          value: {
            range: {
              min: 1,
              max: 142,
            },
          },
        },
      ],
      value: {
        range: {
          min: 1,
        },
      },
    },
  },
};
//#endregion

describe('CitationComponent', () => {
  let component: CitationComponent;
  let fixture: ComponentFixture<CitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationComponent],
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

    fixture = TestBed.createComponent(CitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
