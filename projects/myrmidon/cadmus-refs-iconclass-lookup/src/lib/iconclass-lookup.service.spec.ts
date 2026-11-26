import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { IconclassRefLookupService } from './iconclass-lookup.service';
import { IconclassNotation, IconclassService } from './iconclass.service';

function notation(n: string, en: string): IconclassNotation {
  return { n, b: n, p: [n], txt: { en }, kw: {} };
}

describe('IconclassRefLookupService', () => {
  let service: IconclassRefLookupService;
  let iconclass: {
    search: ReturnType<typeof vi.fn>;
    getNotation: ReturnType<typeof vi.fn>;
    getLabel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    iconclass = {
      search: vi.fn(() => of({ result: ['97EE1', '25F713'], total: 2 })),
      getNotation: vi.fn((n: string) =>
        of(n === 'missing' ? undefined : notation(n, 'label of ' + n)),
      ),
      getLabel: vi.fn((item: IconclassNotation) => item.txt.en || item.n),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: IconclassService, useValue: iconclass }],
    });
    service = TestBed.inject(IconclassRefLookupService);
  });

  it('should have the iconclass ID', () => {
    expect(service.id).toBe('iconclass');
  });

  it('lookup should return nothing without text', async () => {
    const items = await firstValueFrom(
      service.lookup({ text: '', limit: 10 }),
    );
    expect(items).toEqual([]);
    expect(iconclass.search).not.toHaveBeenCalled();
  });

  it('lookup should append the wildcard and resolve each notation', async () => {
    const items = await firstValueFrom(
      service.lookup({ text: 'spi', limit: 5 }),
    );
    expect(iconclass.search).toHaveBeenCalledWith('spi*', { size: 5 });
    expect(items.map((i) => i.n)).toEqual(['97EE1', '25F713']);
  });

  it('lookup should not duplicate the wildcard', async () => {
    await firstValueFrom(service.lookup({ text: 'spi*', limit: 5 }));
    expect(iconclass.search.mock.calls[0][0]).toBe('spi*');
  });

  it('lookup should drop the notations not found', async () => {
    iconclass.search.mockReturnValue(
      of({ result: ['97EE1', 'missing'], total: 2 }),
    );
    const items = await firstValueFrom(
      service.lookup({ text: 'x', limit: 5 }),
    );
    expect(items.map((i) => i.n)).toEqual(['97EE1']);
  });

  it('getById should get the notation', async () => {
    const item = await firstValueFrom(service.getById('97EE1'));
    expect(item?.n).toBe('97EE1');
  });

  it('getById should return undefined without ID', async () => {
    expect(await firstValueFrom(service.getById(''))).toBeUndefined();
    expect(iconclass.getNotation).not.toHaveBeenCalled();
  });

  it('getName should return the short label with the notation', () => {
    expect(
      service.getName(notation('97EE1', 'Arachne changed into a spider: x')),
    ).toBe('Arachne changed into a spider (97EE1)');
    expect(service.getName(notation('1', 'a; b: c'))).toBe('a (1)');
    expect(service.getName(notation('2', 'plain'))).toBe('plain (2)');
  });

  it('getName should return empty for no item', () => {
    expect(service.getName(undefined)).toBe('');
  });
});
