import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError, Observable } from 'rxjs';

import {
  RefLookupComponent,
  RefLookupService,
  LookupProviderOptions,
} from './ref-lookup.component';

/**
 * Wait for the RxJS debounceTime(300) used by the component's lookup
 * control to elapse. Real timers are used (see cod-location.component.spec.ts
 * for the rationale): this project's vitest setup does not load
 * zone-testing.js, so fakeAsync/tick cannot reach the zone-patched timers
 * that RxJS ends up using.
 */
function advanceDebounce(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FakeItem {
  id: string;
  name: string;
}

class FakeLookupService implements RefLookupService {
  public readonly id = 'fake';
  public lastFilter: any;
  public lastOptions: any;
  public delayMs = 0;
  public items: FakeItem[] = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
  ];

  public lookup(filter: any, options?: any): Observable<FakeItem[]> {
    this.lastFilter = filter;
    this.lastOptions = options;
    const matches = this.items.filter((i) =>
      i.name.toLowerCase().includes((filter.text || '').toLowerCase())
    );
    if (!this.delayMs) {
      return of(matches);
    }
    return new Observable<FakeItem[]>((subscriber) => {
      const t = setTimeout(() => {
        subscriber.next(matches);
        subscriber.complete();
      }, this.delayMs);
      return () => clearTimeout(t);
    });
  }

  public getName(item: FakeItem | undefined): string {
    return item?.name || '';
  }

  public getById(id: string): Observable<FakeItem | undefined> {
    return of(this.items.find((i) => i.id === id));
  }
}

describe('RefLookupComponent', () => {
  let component: RefLookupComponent;
  let fixture: ComponentFixture<RefLookupComponent>;
  let service: FakeLookupService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefLookupComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(RefLookupComponent);
    component = fixture.componentInstance;
    service = new FakeLookupService();
    fixture.componentRef.setInput('service', service);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default limit to 10', () => {
    expect(component.limit()).toBe(10);
  });

  it('getLookupName should delegate to the service', () => {
    expect(component.getLookupName({ id: '1', name: 'Alpha' })).toBe('Alpha');
  });

  it('getLookupName should return empty string when the service signal resolves to nothing', () => {
    // service is a required input signal (always a defined function), but
    // getLookupName defensively re-checks its resolved value; simulate that
    // defensive branch by stubbing what the signal function returns
    const spy = vi.spyOn(component, 'service').mockReturnValue(undefined as any);
    expect(component.getLookupName({ id: '1', name: 'Alpha' })).toBe('');
    spy.mockRestore();
  });

  it('should call service.lookup with the typed text and emit matching items', async () => {
    let results: FakeItem[] | undefined;
    component.items$.subscribe((v) => (results = v));

    component.form.lookup().value.set('alp');
    await advanceDebounce();

    expect(service.lastFilter.text).toBe('alp');
    expect(service.lastFilter.limit).toBe(10);
    expect(results).toEqual([{ id: '1', name: 'Alpha' }]);
  });

  it('should merge baseFilter into the lookup filter', async () => {
    fixture.componentRef.setInput('baseFilter', { scope: 'test' });
    fixture.detectChanges();

    component.items$.subscribe(() => {});
    component.form.lookup().value.set('be');
    await advanceDebounce();

    expect(service.lastFilter.scope).toBe('test');
    expect(service.lastFilter.text).toBe('be');
  });

  it('should toggle the loading signal true while the lookup is pending, then false', async () => {
    service.delayMs = 150;
    component.items$.subscribe(() => {});
    component.form.lookup().value.set('a');

    // still within the 300ms debounce window: lookup not even started yet
    expect(component.loading()).toBe(false);

    // debounce elapsed, lookup started (150ms delay), but not resolved yet
    await advanceDebounce(320);
    expect(component.loading()).toBe(true);

    // now the delayed lookup should have resolved
    await advanceDebounce(200);
    expect(component.loading()).toBe(false);
  });

  it('should wrap a non-string value (e.g. a picked item) into an array without calling the service', async () => {
    let results: FakeItem[] | undefined;
    component.items$.subscribe((v) => (results = v));

    const item: FakeItem = { id: '1', name: 'Alpha' };
    component.form.lookup().value.set(item);
    await advanceDebounce();

    expect(results).toEqual([item]);
  });

  it('clear should reset item, lookup control and lookupActive', () => {
    component.pickItem({ id: '1', name: 'Alpha' });
    component.lookupActive.set(true);

    component.clear();

    expect(component.item()).toBeUndefined();
    expect(component.form.lookup().value()).toBeFalsy();
    expect(component.lookupActive()).toBe(false);
  });

  it('pickItem should set the item and close the lookup', () => {
    component.lookupActive.set(true);
    const item = { id: '2', name: 'Beta' };

    component.pickItem(item);

    expect(component.item()).toEqual(item);
    expect(component.lookupActive()).toBe(false);
  });

  it('requestMore should emit moreRequest with the current item and close the lookup', () => {
    const item = { id: '2', name: 'Beta' };
    component.pickItem(item);
    component.lookupActive.set(true);

    let emitted: unknown;
    component.moreRequest.subscribe((v) => (emitted = v));
    component.requestMore();

    expect(emitted).toEqual(item);
    expect(component.lookupActive()).toBe(false);
  });

  it('should mark invalid when required and no item is set', () => {
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();

    let invalid: boolean | undefined;
    component.invalid$.subscribe((v) => (invalid = v));
    expect(invalid).toBe(true);
  });

  it('should mark valid once an item is picked while required', () => {
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    component.pickItem({ id: '1', name: 'Alpha' });
    fixture.detectChanges();

    let invalid: boolean | undefined;
    component.invalid$.subscribe((v) => (invalid = v));
    expect(invalid).toBe(false);
  });

  it('openLink should resolve a simple placeholder and open the URL', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.pickItem({ id: '1', name: 'Alpha' });
    fixture.componentRef.setInput('linkTemplate', 'https://example.org/{id}');
    fixture.detectChanges();

    component.openLink();

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.org/1',
      '_blank'
    );
    openSpy.mockRestore();
  });

  it('openLink should resolve a dotted path placeholder', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.pickItem({ nested: { id: '42' }, name: 'Deep' });
    fixture.componentRef.setInput(
      'linkTemplate',
      'https://example.org/{nested.id}'
    );
    fixture.detectChanges();

    component.openLink();

    expect(openSpy).toHaveBeenCalledWith('https://example.org/42', '_blank');
    openSpy.mockRestore();
  });

  it('openLink should do nothing when there is no item', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    fixture.componentRef.setInput('linkTemplate', 'https://example.org/{id}');
    fixture.detectChanges();

    component.openLink();

    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('openLink should do nothing when there is no linkTemplate', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.pickItem({ id: '1', name: 'Alpha' });
    fixture.detectChanges();

    component.openLink();

    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('showOptions should do nothing when there is no optDialog', () => {
    // RefLookupComponent imports MatDialogModule directly in its own
    // standalone `imports`, and that module re-provides MatDialog at the
    // component's own environment injector level (see MatDialogModule's
    // `providers: [MatDialog]`), so the instance actually used by the
    // component is NOT the same as TestBed's root-level MatDialog; fetch
    // it from the component's own injector instead.
    const dialog = fixture.debugElement.injector.get(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open');
    component.showOptions();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('showOptions should open the options dialog and apply the returned options', () => {
    fixture.componentRef.setInput('optDialog', {});
    fixture.detectChanges();

    // RefLookupComponent imports MatDialogModule directly in its own
    // standalone `imports`, and that module re-provides MatDialog at the
    // component's own environment injector level (see MatDialogModule's
    // `providers: [MatDialog]`), so the instance actually used by the
    // component is NOT the same as TestBed's root-level MatDialog; fetch
    // it from the component's own injector instead.
    const dialog = fixture.debugElement.injector.get(MatDialog);
    const afterClosed = of({ foo: 'bar' });
    const openSpy = vi
      .spyOn(dialog, 'open')
      .mockReturnValue({ afterClosed: () => afterClosed } as any);

    component.showOptions();

    expect(openSpy).toHaveBeenCalled();
    expect(component.options()).toEqual({ foo: 'bar' });
  });

  it('showOptions should reset options when the dialog is closed without a result', () => {
    fixture.componentRef.setInput('optDialog', {});
    fixture.detectChanges();

    // RefLookupComponent imports MatDialogModule directly in its own
    // standalone `imports`, and that module re-provides MatDialog at the
    // component's own environment injector level (see MatDialogModule's
    // `providers: [MatDialog]`), so the instance actually used by the
    // component is NOT the same as TestBed's root-level MatDialog; fetch
    // it from the component's own injector instead.
    const dialog = fixture.debugElement.injector.get(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(undefined),
    } as any);

    component.showOptions();

    expect(component.options()).toBeUndefined();
  });

  describe('lookup provider scopes', () => {
    const providerOptions: LookupProviderOptions = {
      fake: {
        default: null,
        people: { label: 'people', options: { type: 'people' } },
        works: { label: 'works', options: { type: 'works' } },
      },
    };

    it('availableScopes should be empty without lookupProviderOptions', () => {
      expect(component.availableScopes()).toEqual([]);
    });

    it('availableScopes should list the scopes for the current service id', () => {
      fixture.componentRef.setInput('lookupProviderOptions', providerOptions);
      fixture.detectChanges();

      const scopes = component.availableScopes();
      expect(scopes.length).toBe(3);
      expect(scopes.map((s) => s.key).sort()).toEqual([
        'default',
        'people',
        'works',
      ]);
    });

    it('should auto-select the first scope when multiple scopes are available', () => {
      fixture.componentRef.setInput('lookupProviderOptions', providerOptions);
      fixture.detectChanges();

      expect(component.selectedScopeKey()).toBeTruthy();
      const scopes = component.availableScopes();
      expect(component.selectedScopeKey()).toBe(scopes[0].key);
    });

    it('should auto-apply the single scope when only one is available', () => {
      const singleScopeOptions: LookupProviderOptions = {
        fake: {
          onlyOne: { label: 'only one', options: { type: 'only' } },
        },
      };
      fixture.componentRef.setInput(
        'lookupProviderOptions',
        singleScopeOptions
      );
      fixture.detectChanges();

      expect(component.selectedScopeKey()).toBe('onlyOne');
      expect(component.options()).toEqual({ type: 'only' });
    });

    it('onScopeChange should update the selected scope and options', () => {
      fixture.componentRef.setInput('lookupProviderOptions', providerOptions);
      fixture.detectChanges();

      component.onScopeChange('works');

      expect(component.selectedScopeKey()).toBe('works');
      expect(component.options()).toEqual({ type: 'works' });
    });

    it('onScopeChange to the default (null options) scope should clear options', () => {
      fixture.componentRef.setInput('lookupProviderOptions', providerOptions);
      fixture.detectChanges();

      component.onScopeChange('default');

      expect(component.selectedScopeKey()).toBe('default');
      expect(component.options()).toBeUndefined();
    });
  });

  describe('itemId resolution', () => {
    it('should resolve the item via service.getById when itemId is set', () => {
      fixture.componentRef.setInput('itemId', '2');
      fixture.detectChanges();

      expect(component.item()).toEqual({ id: '2', name: 'Beta' });
    });

    it('should leave the item untouched when getById resolves to undefined', () => {
      fixture.componentRef.setInput('itemId', 'missing');
      fixture.detectChanges();

      expect(component.item()).toBeUndefined();
    });
  });
});
