import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { render } from '@testing-library/angular';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RamStorageService } from '@myrmidon/ngx-tools';

import { AssertedCompositeIdComponent } from './asserted-composite-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

describe('AssertedCompositeIdComponent', () => {
  beforeAll(() => {
    TestBed.initTestEnvironment(
      BrowserTestingModule,
      platformBrowserTesting()
    );
  });

  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: [
        provideHttpClientTesting(),
        {
          provide: PinRefLookupService,
          useValue: {
            lookup: vi.fn(),
            getName: vi.fn().mockReturnValue(''),
          },
        },
        {
          provide: 'indexLookupDefinitions',
          useValue: {},
        },
        {
          provide: RamStorageService,
          useValue: {
            retrieve: vi.fn(),
          },
        },
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
