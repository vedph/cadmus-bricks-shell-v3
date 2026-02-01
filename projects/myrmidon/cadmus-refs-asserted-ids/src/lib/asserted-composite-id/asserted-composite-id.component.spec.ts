import { vi } from 'vitest';
import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { RamStorageService } from '@myrmidon/ngx-tools';

import { AssertedCompositeIdComponent } from './asserted-composite-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

describe('AssertedCompositeIdComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: [
        provideNoopAnimations(),
        {
          provide: PinRefLookupService,
          useValue: {
            lookup: vi.fn(),
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
